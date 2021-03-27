module.exports = (string, maxWidth) => {
	const diff = maxWidth - string.length;
	if (diff <= 0) {
		return string;
	}

	return `${string}${new Array(diff).fill(' ').join('')}`;
}
