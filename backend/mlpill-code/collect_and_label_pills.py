import argparse
import base64
import hashlib
import io
import json
import os
import re
import time
from typing import Any, Dict, Iterable, List, Optional, Tuple

import requests
from PIL import Image


DEFAULT_QUERIES = [
    "aspirin pill",
    "ibuprofen pill",
    "acetaminophen pill",
    "metformin pill",
    "lisinopril pill",
    "atorvastatin pill",
    "omeprazole pill",
    "sertraline pill",
    "levothyroxine pill",
    "amoxicillin pill",
]

DEFAULT_CLASSES = ["pill"]


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "query"


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def read_query_file(path: str) -> List[str]:
    queries: List[str] = []
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            queries.append(line)
    return queries


def parse_classes(args: argparse.Namespace) -> List[str]:
    if args.classes_file:
        with open(args.classes_file, "r", encoding="utf-8") as handle:
            classes = [line.strip() for line in handle if line.strip()]
            return classes or DEFAULT_CLASSES
    if args.classes:
        return [c.strip() for c in args.classes.split(",") if c.strip()]
    return DEFAULT_CLASSES


def load_queries(args: argparse.Namespace) -> List[str]:
    if args.query_file:
        return read_query_file(args.query_file)
    if args.queries:
        return [q.strip() for q in args.queries.split(",") if q.strip()]
    return DEFAULT_QUERIES


def search_images_serpapi(query: str, api_key: str, max_results: int) -> List[str]:
    params = {
        "engine": "google_images",
        "q": query,
        "api_key": api_key,
        "ijn": 0,
        "num": min(100, max_results),
    }
    response = requests.get("https://serpapi.com/search.json", params=params, timeout=30)
    response.raise_for_status()
    payload = response.json()
    results = payload.get("images_results", [])
    urls = []
    for item in results:
        url = item.get("original") or item.get("thumbnail")
        if url:
            urls.append(url)
    return urls[:max_results]


def search_images_cse(query: str, api_key: str, cx: str, max_results: int) -> List[str]:
    urls: List[str] = []
    start = 1
    while len(urls) < max_results:
        num = min(10, max_results - len(urls))
        params = {
            "q": query,
            "cx": cx,
            "key": api_key,
            "searchType": "image",
            "num": num,
            "start": start,
        }
        response = requests.get("https://www.googleapis.com/customsearch/v1", params=params, timeout=30)
        response.raise_for_status()
        payload = response.json()
        items = payload.get("items", [])
        for item in items:
            link = item.get("link")
            if link:
                urls.append(link)
        if not items:
            break
        start += num
        if start > 91:
            break
    return urls[:max_results]


def download_image(url: str, timeout: int) -> Tuple[Image.Image, bytes]:
    headers = {"User-Agent": "healthier-pills-dataset/1.0"}
    response = requests.get(url, headers=headers, timeout=timeout)
    response.raise_for_status()
    raw = response.content
    image = Image.open(io.BytesIO(raw))
    image = image.convert("RGB")
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=92)
    return image, buffer.getvalue()


def image_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()[:16]


def write_image(path: str, data: bytes) -> None:
    with open(path, "wb") as handle:
        handle.write(data)


def call_nano_banana_pro(
    image_bytes: bytes,
    api_url: str,
    api_key: Optional[str],
    prompt: str,
    classes: List[str],
    mode: str,
    timeout: int,
) -> Dict[str, Any]:
    headers = {"Accept": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    if mode == "multipart":
        files = {"image": ("image.jpg", image_bytes, "image/jpeg")}
        data = {"prompt": prompt, "classes": ",".join(classes), "task": "object_detection"}
        response = requests.post(api_url, headers=headers, data=data, files=files, timeout=timeout)
    else:
        payload = {
            "image": base64.b64encode(image_bytes).decode("utf-8"),
            "prompt": prompt,
            "classes": classes,
            "task": "object_detection",
        }
        response = requests.post(api_url, headers=headers, json=payload, timeout=timeout)

    response.raise_for_status()
    return response.json()


def extract_boxes(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    if "predictions" in payload and isinstance(payload["predictions"], list):
        return payload["predictions"]
    if "boxes" in payload and isinstance(payload["boxes"], list):
        return payload["boxes"]
    if "detections" in payload and isinstance(payload["detections"], list):
        return payload["detections"]
    return []


def normalize_box(
    box: Dict[str, Any],
    image_size: Tuple[int, int],
) -> Optional[Tuple[str, float, float, float, float, float]]:
    width, height = image_size
    label = box.get("class") or box.get("label") or box.get("name") or "pill"
    confidence = float(box.get("confidence", box.get("score", 1.0)))

    if all(key in box for key in ("x", "y", "width", "height")):
        x_center = float(box["x"]) / width
        y_center = float(box["y"]) / height
        w = float(box["width"]) / width
        h = float(box["height"]) / height
        return label, x_center, y_center, w, h, confidence

    if all(key in box for key in ("x_center", "y_center", "width", "height")):
        x_center = float(box["x_center"])
        y_center = float(box["y_center"])
        w = float(box["width"])
        h = float(box["height"])
        if x_center > 1 or y_center > 1 or w > 1 or h > 1:
            x_center /= width
            y_center /= height
            w /= width
            h /= height
        return label, x_center, y_center, w, h, confidence

    if "bbox" in box and isinstance(box["bbox"], (list, tuple)) and len(box["bbox"]) == 4:
        x1, y1, x2, y2 = [float(v) for v in box["bbox"]]
        x_center = ((x1 + x2) / 2) / width
        y_center = ((y1 + y2) / 2) / height
        w = (x2 - x1) / width
        h = (y2 - y1) / height
        return label, x_center, y_center, w, h, confidence

    if all(key in box for key in ("x1", "y1", "x2", "y2")):
        x1 = float(box["x1"])
        y1 = float(box["y1"])
        x2 = float(box["x2"])
        y2 = float(box["y2"])
        x_center = ((x1 + x2) / 2) / width
        y_center = ((y1 + y2) / 2) / height
        w = (x2 - x1) / width
        h = (y2 - y1) / height
        return label, x_center, y_center, w, h, confidence

    return None


def write_yolo_labels(
    labels_path: str,
    boxes: List[Tuple[str, float, float, float, float, float]],
    classes: List[str],
    min_confidence: float,
) -> int:
    lines: List[str] = []
    for label, x_center, y_center, w, h, confidence in boxes:
        if confidence < min_confidence:
            continue
        if label not in classes:
            if len(classes) == 1:
                class_id = 0
            else:
                continue
        else:
            class_id = classes.index(label)
        x_center = min(max(x_center, 0.0), 1.0)
        y_center = min(max(y_center, 0.0), 1.0)
        w = min(max(w, 0.0), 1.0)
        h = min(max(h, 0.0), 1.0)
        lines.append(f"{class_id} {x_center:.6f} {y_center:.6f} {w:.6f} {h:.6f}")

    if not lines:
        return 0

    with open(labels_path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines))
    return len(lines)


def write_metadata(path: str, record: Dict[str, Any]) -> None:
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect pill images and label via Nano Banana Pro.")
    parser.add_argument("--output-dir", default="dataset", help="Output dataset directory")
    parser.add_argument("--queries", help="Comma-separated list of queries")
    parser.add_argument("--query-file", help="File with one query per line")
    parser.add_argument("--max-per-query", type=int, default=75, help="Max images per query")
    parser.add_argument("--provider", choices=["serpapi", "cse"], default="serpapi")
    parser.add_argument("--serpapi-key", default=os.getenv("SERPAPI_KEY"))
    parser.add_argument("--cse-key", default=os.getenv("GOOGLE_CSE_API_KEY"))
    parser.add_argument("--cse-cx", default=os.getenv("GOOGLE_CSE_CX"))
    parser.add_argument("--download-timeout", type=int, default=20)
    parser.add_argument("--sleep", type=float, default=0.5, help="Delay between requests")
    parser.add_argument("--label", action="store_true", help="Run Nano Banana Pro labeling")
    parser.add_argument("--nano-banana-pro-url", default=os.getenv("NANO_BANANA_PRO_API_URL"))
    parser.add_argument("--nano-banana-pro-key", default=os.getenv("NANO_BANANA_PRO_API_KEY"))
    parser.add_argument("--nano-banana-pro-mode", choices=["base64", "multipart"], default="base64")
    parser.add_argument("--prompt", default="Detect all pills in the image. Return bounding boxes.")
    parser.add_argument("--classes", help="Comma-separated class list")
    parser.add_argument("--classes-file", help="Text file with one class per line")
    parser.add_argument("--min-confidence", type=float, default=0.2)
    parser.add_argument("--label-timeout", type=int, default=45)
    return parser.parse_args()


def validate_provider_args(args: argparse.Namespace) -> None:
    if args.provider == "serpapi" and not args.serpapi_key:
        raise ValueError("SERPAPI_KEY is required for provider=serpapi")
    if args.provider == "cse" and (not args.cse_key or not args.cse_cx):
        raise ValueError("GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX are required for provider=cse")
    if args.label and not args.nano_banana_pro_url:
        raise ValueError("NANO_BANANA_PRO_API_URL is required for labeling")


def main() -> None:
    args = parse_args()
    validate_provider_args(args)

    queries = load_queries(args)
    classes = parse_classes(args)

    output_root = args.output_dir
    images_dir = os.path.join(output_root, "images")
    labels_dir = os.path.join(output_root, "labels")
    ensure_dir(images_dir)
    ensure_dir(labels_dir)

    classes_path = os.path.join(output_root, "classes.txt")
    if not os.path.exists(classes_path):
        with open(classes_path, "w", encoding="utf-8") as handle:
            handle.write("\n".join(classes))

    metadata_path = os.path.join(output_root, "metadata.jsonl")

    seen_urls = set()
    seen_hashes = set()
    downloaded = 0
    labeled = 0

    for query in queries:
        query_slug = slugify(query)
        if args.provider == "serpapi":
            urls = search_images_serpapi(query, args.serpapi_key, args.max_per_query)
        else:
            urls = search_images_cse(query, args.cse_key, args.cse_cx, args.max_per_query)

        for url in urls:
            if url in seen_urls:
                continue
            seen_urls.add(url)

            try:
                image, image_bytes = download_image(url, args.download_timeout)
            except Exception:
                continue

            digest = image_hash(image_bytes)
            if digest in seen_hashes:
                continue
            seen_hashes.add(digest)

            image_name = f"{query_slug}-{digest}.jpg"
            image_path = os.path.join(images_dir, image_name)
            write_image(image_path, image_bytes)
            downloaded += 1

            record = {
                "query": query,
                "source_url": url,
                "image_path": image_path,
                "width": image.width,
                "height": image.height,
            }

            if args.label:
                try:
                    payload = call_nano_banana_pro(
                        image_bytes=image_bytes,
                        api_url=args.nano_banana_pro_url,
                        api_key=args.nano_banana_pro_key,
                        prompt=args.prompt,
                        classes=classes,
                        mode=args.nano_banana_pro_mode,
                        timeout=args.label_timeout,
                    )
                    boxes = extract_boxes(payload)
                    normalized: List[Tuple[str, float, float, float, float, float]] = []
                    for box in boxes:
                        normalized_box = normalize_box(box, (image.width, image.height))
                        if normalized_box:
                            normalized.append(normalized_box)
                    label_path = os.path.join(labels_dir, os.path.splitext(image_name)[0] + ".txt")
                    count = write_yolo_labels(
                        label_path, normalized, classes, args.min_confidence
                    )
                    record["labels_path"] = label_path if count else None
                    record["labels_count"] = count
                    labeled += count
                except Exception:
                    record["labels_path"] = None
                    record["labels_count"] = 0

            write_metadata(metadata_path, record)
            time.sleep(args.sleep)

    print(
        f"Done. Downloaded={downloaded} images, "
        f"labels_written={labeled}, output_dir={output_root}"
    )


if __name__ == "__main__":
    main()
