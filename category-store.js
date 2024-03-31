class CategoryStore {
	constructor() {
	  this.store = {};
	}
  
	// Method to add items to a category.
	// If the category already exists, merge the items with the existing ones.
	add(key, items) {

		if (!Array.isArray(items)) {
			items = [items];
		}

		// Check if the category already exists.
		if (this.store.hasOwnProperty(key)) {

			// Merge the new items with the existing ones if the category already exists.
			this.store[key] = [...new Set([...this.store[key], ...items])];
		} else {
			// Otherwise, just add the new category with its items.
			this.store[key] = items;
		}
	}

	list() {
		return this.store;
	}

	listFlat() {
		let flat = {};
		for (let category in this.store) {
			for (let item of this.store[category]) {
				if (! (item in flat)) {
					flat[item] = [];
				}
				flat[item].push(category);
			}
		}
		return flat;
	}
}

module.exports = CategoryStore;