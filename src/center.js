import stringWidth from 'string-width';

export default (string, maxWidth) => {
	const width = stringWidth(string);

	if (width >= maxWidth) {
		return string;
	}

	const padding = new Array(~~((maxWidth - width) / 2)).fill(' ').join('');
	return `${padding}${string}${padding}`;
};
