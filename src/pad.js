const stringWidth = require('string-width');

module.exports = (string, maxWidth) => {
	const diff = maxWidth - stringWidth(string);
	if (diff <= 0) {
		return string;
	}

	return `${string}${new Array(diff).fill(' ').join('')}`;
}
