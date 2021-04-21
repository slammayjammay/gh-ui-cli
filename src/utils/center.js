import stringWidth from 'string-width';

// TODO: ensure string width matches maxWidth
export default (string, maxWidth) => {
	const width = stringWidth(string);

	if (width >= maxWidth) {
		return string;
	}

	const padding = new Array(~~((maxWidth - width) / 2)).fill(' ').join('');
	return `${padding}${string}${padding}`;
};
