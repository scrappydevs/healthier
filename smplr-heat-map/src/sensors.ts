import { UnknownData } from '@smplrspace/smplr-loader';

export interface Sensor extends UnknownData {
  id: string;
  name: string;
  position: {
    x: number;
    z: number;
    elevation: number;
    levelIndex: number;
  };
}

export const sensors: Sensor[] = [
  {
    id: 'de9844aef33d',
    name: '1',
    position: {
      x: 120.72363861531221,
      z: -55.37731272654325,
      elevation: 0.009999999776482582,
      levelIndex: 0,
    },
  },
  {
    id: 'cde60d0f9c4b',
    name: '2',
    position: {
      x: 120.31616658822531,
      z: -40.32848595282147,
      elevation: 0.009999999776486135,
      levelIndex: 0,
    },
  },
  {
    id: 'e22831cdda28',
    name: '3',
    position: {
      x: 117.51274810528558,
      z: -38.38687380878737,
      elevation: 0.009999999776482582,
      levelIndex: 0,
    },
  },
  {
    id: 'f7262ecc48b9',
    name: '4',
    position: {
      x: 117.82239335232062,
      z: -49.51764202937709,
      elevation: 0.009999999776486135,
      levelIndex: 0,
    },
  },
  {
    id: 'fdee6f5c3609',
    name: '5',
    position: {
      x: 136.54854211915313,
      z: -56.12197980280458,
      elevation: 0.009999999776482582,
      levelIndex: 0,
    },
  },
  {
    id: 'fa4ced683b3e',
    name: '6',
    position: {
      x: 97.77430667927675,
      z: -57.3023438052912,
      elevation: 0.009999999776482582,
      levelIndex: 0,
    },
  },
  {
    id: 'fb1bd4c58976',
    name: '7',
    position: {
      x: 107.511986825776,
      z: -53.488347539106115,
      elevation: 0.009999999776482582,
      levelIndex: 0,
    },
  },
  {
    id: 'c3b82bf22edc',
    name: '8',
    position: {
      x: 116.18496766013054,
      z: -49.64956961177282,
      elevation: 0.009999999776496793,
      levelIndex: 0,
    },
  },
  {
    id: 'cae274222f6c',
    name: '9',
    position: {
      x: 126.53886269246092,
      z: -60.5842980863642,
      elevation: 0.009999999776503898,
      levelIndex: 0,
    },
  },
  {
    id: 'f34a076b36a3',
    name: '10',
    position: {
      x: 117.57374279582795,
      z: -48.555304314518494,
      elevation: 0.009999999776489688,
      levelIndex: 0,
    },
  },
  {
    id: 'c94f3f0243a7',
    name: '11',
    position: {
      x: 115.84157357866134,
      z: -48.53316088837151,
      elevation: 0.009999999776503898,
      levelIndex: 0,
    },
  },
  {
    id: 'f3524c41d309',
    name: '12',
    position: {
      x: 112.93403943261109,
      z: -46.77269913954395,
      elevation: 0.009999999776489688,
      levelIndex: 0,
    },
  },
  {
    id: 'd7942311a750',
    name: '13',
    position: {
      x: 120.64810233459582,
      z: -46.60908426577184,
      elevation: 0.009999999776482582,
      levelIndex: 0,
    },
  },
  {
    id: 'e5fb7587a358',
    name: '14',
    position: {
      x: 116.20911006309461,
      z: -38.400813282810724,
      elevation: 0.009999999776496793,
      levelIndex: 0,
    },
  },
  {
    id: 'c5a4f171c1f8',
    name: '15',
    position: {
      x: 107.55121161309727,
      z: -37.61779228809321,
      elevation: 0.009999999776511004,
      levelIndex: 0,
    },
  },
  {
    id: 'cc51c86dfc78',
    name: '16',
    position: {
      x: 128.28534381725393,
      z: -42.1580788002604,
      elevation: 0.009999999776489688,
      levelIndex: 0,
    },
  },
];
