import * as React from 'react';
import { FC, useEffect, useState, useCallback, useMemo } from 'react';
import { loadSmplrJs, Smplr, Space } from '@smplrspace/smplr-loader';
import 'antd/dist/antd.css';

import { sensors } from './sensors';
import { timeseries } from './timeseries';
import { isNil } from 'ramda';

export const envs = {
  dev: {
    spaceId: 'spc_z8aua0s4',
    clientToken: 'pub_d3d112d5391f404b92f7e3a8fea8f5ec',
  },
  prod: {
    spaceId: 'spc_kbqb3yxi',
    clientToken: 'pub_4fda7bdd6a4d465c9fc615cbcd0b2aad',
  },
};
export const envToUse = 'dev';

export const SpaceViewer: FC = () => {
  const smplrRef = React.useRef<Smplr>();
  const spaceRef = React.useRef<Space>();

  const [viewerReady, setViewerReady] = useState(false);

  const heatmapData = useMemo(
    () =>
      timeseries
        .map((d) => {
          const sensor = sensors.find((s) => s.id === d.uuid);
          if (!sensor) {
            return null;
          }
          return { ...d, position: sensor.position };
        })
        .filter((d) => !isNil(d)),
    []
  );

  // start viewer
  useEffect(() => {
    // we recommend using the default value 'esm' in your code but stackblitz required 'umd'
    loadSmplrJs('umd', envToUse)
      .then((smplr) => {
        smplrRef.current = smplr;
        spaceRef.current = new smplr.Space({
          containerId: 'test',
          ...envs[envToUse],
        });
        spaceRef.current.startViewer({
          preview: false,
          allowModeChange: true,
          renderOptions: {
            backgroundColor: '#F3F6F8',
          },
          onReady: () => {
            setViewerReady(true);
          },
          onError: (error) => console.error('Could not start viewer', error),
        });
      })
      .catch((error) => console.error(error));
  }, []);

  // show data when viewer ready
  useEffect(() => {
    if (!viewerReady) {
      return;
    }
    // heatmap
    spaceRef.current.addDataLayer({
      id: 'hm',
      type: 'heatmap',
      style: 'bar-chart',
      data: heatmapData,
      value: (d) => d.value,
      color: smplrRef.current.Color.numericScale({
        name: smplrRef.current.Color.NumericScale.RdYlGn,
        domain: [400, 800],
        invert: true,
      }),
      height: (v) => (v - 400) / 150,
      confidenceRadius: 9,
      gridSize: 0.6,
    });
    return () => {
      spaceRef.current.removeDataLayer('hm');
    };
  }, [viewerReady, heatmapData]);

  // render
  return (
    <>
      <div className="smplr-wrapper">
        <div id="test" className="smplr-embed"></div>
      </div>
    </>
  );
};
