// Regenerates content/yarn-ball-art.js from assets/imagegen/yarn-ball.
import {writeFile} from 'node:fs/promises';
import {convertYarnBall} from '../assets/imagegen/yarn-ball/convert.mjs';

const text=convertYarnBall();
await writeFile(new URL('../content/yarn-ball-art.js',import.meta.url),text);
console.log('Wrote content/yarn-ball-art.js',text.length,'bytes');
