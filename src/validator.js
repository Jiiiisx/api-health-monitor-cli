// src/validator.js

const VALID_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];

export const isValidMethod = (method) => {
  return VALID_METHODS.includes(method.toUpperCase());
};

export const isValidUrl = (urlString) => {
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const isValidStatusCode = (code) => {
  const numericCode = Number(code);
  return Number.isInteger(numericCode) && numericCode >= 100 && numericCode <= 599;
};

export const isIdExist = (id, list) => {
  // Bonus B.1: Memanfaatkan .some() untuk pengecekan keberadaan data
  return list.some((item) => item.id === id);
};
