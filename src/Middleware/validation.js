export const REGEX = {
  USER: {
    EMAIL: new RegExp('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$', 'i'),
    PASSWORD: new RegExp('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$'),
    PHONE: new RegExp('^(\\+\\d{1,3}[- ]?)?\\d{10}$'),
  },
};

export const emailValidation = (email) => {
  return REGEX.USER.EMAIL.test(email);
};

export const passwordValidation = (password) => {
  return REGEX.USER.PASSWORD.test(password);
};

export const phoneValidation = (phone) => {
  return REGEX.USER.PHONE.test(String(phone).replace(/\s/g, ''));
};
