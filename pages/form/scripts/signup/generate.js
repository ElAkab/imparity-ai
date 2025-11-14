// generate.js

export function generatePassword(desiredLength = 12) {
	const LOWERCHAR = "abcdefghijklmnopqrstuvwxyz";
	const UPPERCHAR = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const NUMBERCHAR = "0123456789";
	const SPECIALCHAR = "!@#$%^&*()_+~`|}{[]:;?><,./-=";

	const categories = [LOWERCHAR, UPPERCHAR, NUMBERCHAR, SPECIALCHAR];

	let password = "";
	let lastCategoryIndex = -1;

	while (password.length < desiredLength) {
		let randomCategoryIndex;

		// Évite de répéter la même catégorie
		do {
			randomCategoryIndex = Math.floor(Math.random() * categories.length);
		} while (randomCategoryIndex === lastCategoryIndex);

		const category = categories[randomCategoryIndex];
		const randomChar = category[Math.floor(Math.random() * category.length)];

		password += randomChar;
		lastCategoryIndex = randomCategoryIndex;
	}

	return password;
}
