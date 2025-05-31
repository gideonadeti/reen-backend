import { execSync } from 'child_process';
import { mkdirSync } from 'fs';

const inputDir = 'libs/protos/src';
const outputDir = `${inputDir}/generated`;

mkdirSync(outputDir, { recursive: true });

const command = [
  'protoc',
  `--ts_proto_out=${outputDir}`,
  '--ts_proto_opt=nestJs=true,useDate=true',
  `--proto_path=${inputDir}`,
  `${inputDir}/*.proto`,
].join(' ');

try {
  execSync(command, { stdio: 'inherit' });

  console.log('Protos generated successfully');
} catch (error) {
  console.error('Failed to generate protos:', error);
  process.exit(1);
}
