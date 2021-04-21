import stringWidth from 'string-width';

export default (string, maxWidth) => {
	const width = stringWidth(string);

	if (width >= maxWidth) {
		return string;
	}

	const paddingAmount = ~~((maxWidth - width) / 2);
	const needsMore = width + paddingAmount * 2 < maxWidth;

	const padding = new Array(paddingAmount).fill(' ').join('');
	return `${padding}${string}${padding}${needsMore ? ' ' : ''}`;
};
