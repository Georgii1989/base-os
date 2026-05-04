/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const solc = require("solc");

function readContractSource() {
  const contractPath = path.join(__dirname, "..", "contracts", "TipJar.sol");
  return fs.readFileSync(contractPath, "utf8");
}

function buildCompilerInput(source) {
  return {
    language: "Solidity",
    sources: {
      "contracts/TipJar.sol": {
        content: source,
      },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"],
        },
      },
    },
  };
}

function main() {
  const input = buildCompilerInput(readContractSource());
  const outputJson = solc.compile(JSON.stringify(input), {
    import: () => ({ error: "File import callback is not supported for this minimal compile script." }),
  });

  const output = JSON.parse(outputJson);
  if (output.errors) {
    const fatal = output.errors.filter((e) => e.severity === "error");
    if (fatal.length > 0) {
      console.error(fatal.map((e) => e.formattedMessage).join("\n"));
      process.exit(1);
    }
  }

  const compiled = output.contracts["contracts/TipJar.sol"]?.TipJar;
  if (!compiled) {
    console.error("Compilation failed: TipJar artifact missing from solc output.");
    process.exit(1);
  }

  const artifactDir = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "TipJar.sol"
  );
  fs.mkdirSync(artifactDir, { recursive: true });

  const artifactPath = path.join(artifactDir, "TipJar.json");
  const artifact = {
    _format: "hh-sol-artifact-1",
    contractName: "TipJar",
    sourceName: "contracts/TipJar.sol",
    abi: compiled.abi,
    bytecode: compiled.evm.bytecode.object,
    deployedBytecode: compiled.evm.deployedBytecode.object,
    linkReferences: compiled.evm.bytecode.linkReferences || {},
    deployedLinkReferences: compiled.evm.deployedBytecode.linkReferences || {},
    metadata: compiled.metadata,
  };

  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2) + "\n", "utf8");
  console.log(`Wrote artifact: ${artifactPath}`);
}

main();
