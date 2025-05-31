import { execSync } from 'child_process';

const folder = process.argv[2];

if (!folder) {
  console.error('Please specify a folder name');
  process.exit(1);
}

const input = `libs/protos/src/${folder}`;
const output = `${input}/generated`;

const command = [
  'protoc',
  `--ts_proto_out=${output}`,
  '--ts_proto_opt=nestJs=true,useDate=true',
  `--proto_path=libs/protos/src/${folder}`,
  `${input}/*.proto`,
].join(' ');

execSync(command);

console.log(`Proto for ${folder} generated successfully`);
