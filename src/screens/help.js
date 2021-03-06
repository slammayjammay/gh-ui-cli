import figlet from 'figlet';
import chalk from 'chalk';

export default
`
${chalk.green(figlet.textSync('GitHub UI CLI', { font: 'Calvin S' }))}

${chalk.bold('OPTIONS')}
    -h, --help            Print this help screen.
    -c, --config          Path to config file (default ${chalk.bold('$HOME/.config/gh-ui-cli/config.json')}).
    -u, --username        Username used for authentication.
    -t, --token           Personal access token for authentication.
    -a, --api-url         URL base to use for API requests (default ${chalk.bold('https://api.github.com')})

${chalk.bold('CONFIG')}
    Config values may optionally be saved in, and read from, a JSON file. Provide the path to the JSON config file by using the ${chalk.bold('--config')} option.
    If no path is provided but the ${chalk.bold('--config')} option is present, ${chalk.bold('$HOME/.config/gh-ui-cli/config.json')} will be assumed.

    ${chalk.cyan('$ gh-ui-cli -c $HOME/path/to/my/config-file.json')}
    ${chalk.cyan('$ gh-ui-cli -c')}

    Possible config values:
    ${chalk.bold('username')}     ${chalk.gray('(string)')}       Username used for authentication.
    ${chalk.bold('token')}        ${chalk.gray('(string)')}       GitHub personal access token.
    ${chalk.bold('tokenEnvVar')}  ${chalk.gray('(string)')}       Environment variable to use for personal access token.
    ${chalk.bold('apiUrl')}       ${chalk.gray('(string)')}       URL base to use for API requests (default ${chalk.bold('https://api.github.com')})

    Note: if the "tokenPath" config key is provided, the path must point to a file that only contains the personal access token (whitespace OK).

    All other options, if provided, take precendence over the config values.
`;
