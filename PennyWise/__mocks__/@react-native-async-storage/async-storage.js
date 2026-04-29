const mockStorage = {};

module.exports = {
  getItem:     jest.fn((key) => Promise.resolve(mockStorage[key] ?? null)),
  setItem:     jest.fn((key, value) => { mockStorage[key] = String(value); return Promise.resolve(); }),
  removeItem:  jest.fn((key) => { delete mockStorage[key]; return Promise.resolve(); }),
  clear:       jest.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); return Promise.resolve(); }),
  getAllKeys:   jest.fn(() => Promise.resolve(Object.keys(mockStorage))),
  multiGet:    jest.fn((keys) => Promise.resolve(keys.map(k => [k, mockStorage[k] ?? null]))),
  multiSet:    jest.fn((pairs) => { pairs.forEach(([k, v]) => { mockStorage[k] = v; }); return Promise.resolve(); }),
  multiRemove: jest.fn((keys) => { keys.forEach(k => delete mockStorage[k]); return Promise.resolve(); }),
};
