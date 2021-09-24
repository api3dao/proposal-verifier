const ethers = require("ethers");
const { expect } = require("chai");
const proposal = require(`./proposalSpecs/${process.env.PROPOSAL}.json`);

const providerUrl = process.env.PROVIDER_URL;
const provider = providerUrl
  ? new ethers.providers.JsonRpcProvider(providerUrl)
  : ethers.providers.getDefaultProvider("mainnet");

console.log(JSON.stringify(proposal, null, 2));

const votingAppAddress = "0x05811ad31cbd5905e4e1427482713e3fb04a4c05";
const agentAppAddress = "0xe7af7c5982e073ac6525a34821fe1b3e8e432099";

// Constants
const executeSignature = encodeFunctionSignature(
  "execute(address,uint256,bytes)"
);
const votingAppAbi = [
  "function getVote(uint256 _voteId) public view returns (bool open, bool executed, uint64 startDate, uint64 snapshotBlock, uint64 supportRequired, uint64 minAcceptQuorum, uint256 yea, uint256 nay, uint256 votingPower, bytes script)",
];

function encodeFunctionSignature(functionSignature) {
  return ethers.utils.hexDataSlice(
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes(functionSignature)),
    0,
    4
  );
}

async function verifyProposal() {
  const parameterTypes = proposal.specs.targetFunction
    .substring(
      proposal.specs.targetFunction.indexOf("(") + 1,
      proposal.specs.targetFunction.indexOf(")")
    )
    .split(",");
  const encodedParameters = ethers.utils.defaultAbiCoder.encode(
    parameterTypes,
    proposal.specs.parameters
  );
  const callData =
    executeSignature +
    ethers.utils.defaultAbiCoder
      .encode(
        ["address", "uint256", "bytes"],
        [
          proposal.specs.targetContractAddress,
          proposal.specs.value,
          encodeFunctionSignature(proposal.specs.targetFunction) +
            encodedParameters.substring(2),
        ]
      )
      .substring(2);
  const callDataLengthInBytes = ethers.utils.hexZeroPad(
    ethers.BigNumber.from(callData.substring(2).length / 2).toHexString(),
    4
  );
  const evmScript =
    "0x00000001" +
    agentAppAddress.substring(2) +
    callDataLengthInBytes.substring(2) +
    callData.substring(2);

  const votingApp = new ethers.Contract(
    votingAppAddress,
    votingAppAbi,
    provider
  );
  const vote = await votingApp.getVote(proposal.specs.proposalNo);
  expect(vote.script).to.equal(evmScript);
  console.log(`Proposal #${process.env.PROPOSAL} is verified!`);
}

verifyProposal();
