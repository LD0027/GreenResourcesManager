import {makeProject} from '@motion-canvas/core';

import main from './scenes/main?scene';
import logo from './scenes/logo?scene';

import arrowTest from './scenes/arrowTest?scene';
import treeTest from './scenes/treeTest?scene';


import test from './scenes/test?scene';
import folderTest from './scenes/folderTest?scene';

export default makeProject({
  scenes: [main,logo],

  // audio: '/配音.wav',
});
