export const APP_MODE = process.env.APP_MODE || 'dev';

export const VALUES = {
  SALT: 12,
  JWT_SECRET: process.env.JWT_SECRET || 'TwinsDay_Restaurant_Secret',
  TOKEN_EXPIRY: process.env.TOKEN_EXPIRY || '12h',
};

export const RES_MESSAGE = {
  USERS: {
    CREATED: 'Account created successfully.',
    LOGIN: 'Logged in successfully',
    ALREADY_CREATED: 'User already registered. Please use a different email or phone.',
    NOT_FOUND: 'User not found',
    LOGIN_FAILED: 'Login failed. Please check your email/phone and password',
    PROFILE_UPDATED: 'Profile updated successfully',
  },
  VALIDATION: {
    INVALID_EMAIL: 'Invalid email',
    INVALID_PASSWORD:
      'Password must be at least 8 characters and include uppercase, lowercase, number and special character',
    PASSWORD_MISMATCH: 'Password does not match',
    CONFIRM_PASSWORD_MISMATCH: 'Password and confirm password do not match',
    INVALID_PHONE: 'Invalid phone number. Please check mobile number',
    UNAUTHORIZED: 'Auth failed!',
    REQUIRED_FIELDS: 'Full name, phone number, email, password and confirm password are required',
    FULL_NAME_REQUIRED: 'Full name is required',
    COMPANY_NAME_REQUIRED: 'Company name is required',
    PROFILE_FIELDS_REQUIRED: 'Full name, email and phone number are required',
    COMPANY_FIELDS_REQUIRED: 'Company name, company phone and address are required',
    COMPANY_LOGO_REQUIRED: 'Company logo is required',
    FOOD_FIELDS_REQUIRED: 'Item name, category, type, price and GST % are required',
    FOOD_NAME_REQUIRED: 'Item name is required',
    INVALID_FOOD_CATEGORY: 'Select one or more valid categories: Breakfast, Lunch, Dinner, Snacks',
    INVALID_FOOD_TYPE: 'Invalid type. Choose Veg or Non-Veg',
    INVALID_FOOD_PRICE: 'Enter a valid price',
    INVALID_FOOD_GST: 'GST % must be between 0 and 100',
    BILL_ITEMS_REQUIRED: 'Select at least one food item with quantity',
    BILL_ITEM_UNAVAILABLE: 'One or more selected items are unavailable',
    INVALID_BILL_QUANTITY: 'Quantity must be a whole number of at least 1',
  },
  COMPANY: {
    FETCHED: 'Company details fetched successfully',
    EMPTY: 'No company details found. Please add company information.',
    CREATED: 'Company details saved successfully',
    UPDATED: 'Company details updated successfully',
  },
  FOOD: {
    FETCHED: 'Food items fetched successfully',
    CREATED: 'Food item added successfully',
    UPDATED: 'Food item updated successfully',
    DELETED: 'Food item deleted successfully',
    REORDERED: 'Food items reordered successfully',
    NOT_FOUND: 'Food item not found',
  },
  BILL: {
    FETCHED: 'Bills fetched successfully',
    CREATED: 'Bill generated successfully',
    UPDATED: 'Bill updated successfully',
    DELETED: 'Bill deleted successfully',
    NOT_FOUND: 'Bill not found',
  },
};
