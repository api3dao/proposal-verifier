# Proposal Verifier

> A tool to verify the specs of a proposal created through the Agent app of the DAO

Parses the call data that was used to make the transaction that created a new vote to verify the target contract address, function, function parameters and value sent.

## Instructions

1. Clone the repo
2. Copy paste the provided proposal specification file under `proposalSpecs/` with the file name `${PROPOSAL_NUMBER}.json`
3. Run `PROPOSAL=${PROPOSAL_NUMBER} npm start` in the project root (e.g. `PROPOSAL=18 npm start`)
