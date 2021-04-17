import stringWidth from 'string-width';

export default (string, maxWidth) => {
	const diff = maxWidth - stringWidth(string);
	if (diff <= 0) {
		return string;
	}

	return `${string}${new Array(diff).fill(' ').join('')}`;
}
