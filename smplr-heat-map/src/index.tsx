import * as React from 'react';
import { FC } from 'react';
import { render } from 'react-dom';

import { SpaceViewer } from './SpaceViewer';

import './style.css';

const App: FC = () => {
  return (
    <div style={{ backgroundColor: 'pink', padding: 0, margin: 0, height: '100vh', width: '100%' }}>
      <SpaceViewer />
    </div>
  );
};

render(<App />, document.getElementById('root'));
