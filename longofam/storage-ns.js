// /kids and /longofam are on the same website, so the browser gives them one shared
// localStorage and sessionStorage. Prefix every key this copy uses so the two family
// apps never read or overwrite each other's saved sign-ins and settings.
const PREFIX = "longofam:";
const proto = Storage.prototype;
const { getItem, setItem, removeItem } = proto;
const named = (key) => PREFIX + String(key);

proto.getItem = function (key) {
  return getItem.call(this, named(key));
};
proto.setItem = function (key, value) {
  return setItem.call(this, named(key), value);
};
proto.removeItem = function (key) {
  return removeItem.call(this, named(key));
};
