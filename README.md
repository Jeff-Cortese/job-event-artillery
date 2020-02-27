# Job Event Artillery
### Setup
#### Install [Node (version >12.16.0 LTS)](https://nodejs.org/en/)
#### Install dependencies
```shell
$ npm install
```

#### Configure
- Open [artillery.yml](artillery.yml), and change the `config.sns.topicArn` to the arn to which this tool will publish events.
- This tool uses the aws-sdk, which expects access keys to be available in an `.aws` folder in your user's home directory.
- Ensure that you have privilege to publish to the specified topic arn.

### Run it
Run a normal load (28 single file jobs per second)
```shell
$ npm run normal-load
```

Run a heavier load (111 single file jobs per second)
```shell
$ npm run heavy-load
```

##### Note that these both run for 5 minutes by default. This length is editable in the [artillery.yml](artillery.yml)

Run a custom load
- add a new section in the [artillery.yml](artillery.yml) `config.environemts` with your desired phases. Then run
```shell
$ npm start -- -e name-of-my-newly-added-env
```

### Extra Config
See artillery's script yaml docs for more on how to further customize phases and scenarios
https://artillery.io/docs/script-reference/

### Multi-Core Processing
You can further configure how many CPUs artillery uses by updating the `ARTILLERY_WORKERS` variables in the `scripts` section of the [package.json](package.json)
(by default `normal-load` uses 2 CPUs, and `heavy-load` uses 7 CPUs)
