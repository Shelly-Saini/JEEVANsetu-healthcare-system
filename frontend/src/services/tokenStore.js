let accessToken = null;
const listeners = new Set();

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token;
  listeners.forEach((fn) => fn(token));
};

export const onAccessTokenChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
