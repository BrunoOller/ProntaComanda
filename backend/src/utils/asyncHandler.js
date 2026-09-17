/**
 * Evita repetir try/catch em todo controller. Qualquer rejeição de Promise
 * cai automaticamente no middleware de erro global (RNF10).
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
