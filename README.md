# 2112-contest-contract

This is a special contract for running a contest, specifically for 2112.run
games.

The basic idea is that there is an entry fee, paid in DATA, to enter the contest.
At the outset, there is a known payout for the top three runners. There is also
a minimum number of runners participating; if not enough people play, then there
is no point in playing. (Especially if there wouldn't be enough DATA in the pot
to pay the winners.) The contest cannot start if not enough people have signed
up, and until it starts it can be "canceled", which means everyone can take
their money back.

The contest has a known duration. After the contest period passes, the winners
can be set by the contract owner. They are responsible for monitoring the
scores of the contest, off-chain. Contest participants must trust that the
owner will do this accurately. After the winners have been set, they can
collect their winnings.

This does not check ownership. You can register for the contest with a runner
that you do not own. You would get the payout if they win, but have no control
over whether they do.

## localhost development

```shell
# deploy the contest registry:
npx hardhat --network localhost run scripts/deploy_registry.js

# deploy a new contest by adding its args to constants.js and then:
npx hardhat --network localhost run scripts/deploy_contest.js
```

## contract management

When a contract is deployed, we save its address to the filesystem in the
`deployed/` directory, ie:

```
deployed/localhost.ContestRegistry
deployed/localhost.RunContest.0
deployed/localhost.RunContest.1
```

Once the contracts are deployed, there are a handful of actions you can take
on them to manage the process:

```shell
# cancel a contest before it starts
npx hardhat --network localhost cancel --contest $(cat deployed/localhost.RunContest.0)

# process a refund for a canceled contract
npx hardhat --network localhost refund --contest $(cat deployed/localhost.RunContest.1) --runner 123

# register a runner (you will be the payer)
npx hardhat --network localhost register --contest $(cat deployed/localhost.RunContest.1) --runner 123

# start a contest
npx hardhat --network localhost start --contest $(cat deployed/localhost.RunContest.1)

# end a contest (set winners)
npx hardhat --network localhost end --contest $(cat deployed/localhost.RunContest.1) --first 123 --second 456 --third 789

# withdraw the contest profits
npx hardhat --network localhost withdraw --contest $(cat deployed/localhost.RunContest.1)
```

## polygonscan verification

For the registry, which should only be necessary once:

```shell
npx hardhat --network polygon verify $(cat deployed/polygon.ContestRegistry)
```

Each time you deploy a new contest (make sure to increment the contest index):

```shell
npx hardhat --network polygon verify --constructor-args scripts/contests/args_0.js $(cat deployed/polygon.RunContest.0)
```

## hardhat development

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```
