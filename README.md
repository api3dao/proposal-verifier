# Proposal Verifier

> A tool to verify the specs of a proposal created through the Agent app of the API3 DAO

Parses the call data that was used to make the transaction that created a new vote to verify the target contract address, function, function parameters and value sent.

## Instructions

1. Clone the repo
1. Run `npm install` in the project root
1. Copy paste the provided proposal specification file under `proposalSpecs/` with the file name `${PROPOSAL_NUMBER}.json`
1. Run `PROPOSAL=${PROPOSAL_NUMBER} npm start` in the project root (e.g. `PROPOSAL=18 npm start`)

## Troubleshooting

- The default `ethers` provider may sometimes rate limit you.
In that case, replace the provider with your own, for example:
```js
const provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/<YOUR_INFURA_KEY>");
```

- Make sure that the adresses in the proposal specs are mixed-case for checksum.
Otherwise, the proposal will not be verified even though the provided specs are correct.
