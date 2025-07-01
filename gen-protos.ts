import { execSync } from 'child_process';
import { mkdirSync } from 'fs';

const inputDir = 'libs/protos/src';
const outputDir = `${inputDir}/generated`;

mkdirSync(outputDir, { recursive: true });

const [, , protoName] = process.argv;

const protoFiles = protoName
  ? `${inputDir}/${protoName}.proto`
  : `${inputDir}/*.proto`;

const command = [
  'protoc',
  `--ts_proto_out=${outputDir}`,
  '--ts_proto_opt=nestJs=true,useDate=true',
  `--proto_path=${inputDir}`,
  protoFiles,
  '&&',
  'nest build protos',
].join(' ');

try {
  execSync(command, { stdio: 'inherit' });
  console.log(
    `Protos generated successfully ${protoName ? `for ${protoName}.proto` : 'for all files'}`,
  );
} catch (error) {
  console.error('Failed to generate protos:', error);
  process.exit(1);
}
