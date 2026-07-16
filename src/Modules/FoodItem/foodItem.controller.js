import FoodItem, { CATEGORIES, TYPES } from './foodItem.model.js';
import { RES_MESSAGE } from '../../Config/appConfig.js';
import { tenantFilter, tenantStamp } from '../../Helpers/tenant.js';

const buildStats = (items = []) => {
  const vegItems = items.filter((item) => item.type === 'Veg').length;
  const nonVegItems = items.filter((item) => item.type === 'Non-Veg').length;
  const availableCount = items.filter((item) => item.available).length;

  return {
    vegItems,
    nonVegItems,
    totalItems: items.length,
    availableCount,
  };
};

const parseFoodPayload = (body) => {
  const { itemName, category, type, price, gstPercent, available } = body;

  const categories = Array.isArray(category)
    ? category
    : typeof category === 'string' && category
      ? [category]
      : [];

  if (
    !itemName ||
    !categories.length ||
    !type ||
    price === undefined ||
    price === ''
  ) {
    return { error: RES_MESSAGE.VALIDATION.FOOD_FIELDS_REQUIRED };
  }

  if (!String(itemName).trim()) {
    return { error: RES_MESSAGE.VALIDATION.FOOD_NAME_REQUIRED };
  }

  const uniqueCategories = [...new Set(categories.map((item) => String(item).trim()))];
  if (uniqueCategories.some((item) => !CATEGORIES.includes(item))) {
    return { error: RES_MESSAGE.VALIDATION.INVALID_FOOD_CATEGORY };
  }

  if (!TYPES.includes(type)) {
    return { error: RES_MESSAGE.VALIDATION.INVALID_FOOD_TYPE };
  }

  const parsedPrice = Number(price);
  const parsedGst =
    gstPercent === undefined || gstPercent === null || gstPercent === ''
      ? 0
      : Number(gstPercent);

  if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
    return { error: RES_MESSAGE.VALIDATION.INVALID_FOOD_PRICE };
  }

  if (Number.isNaN(parsedGst) || parsedGst < 0 || parsedGst > 100) {
    return { error: RES_MESSAGE.VALIDATION.INVALID_FOOD_GST };
  }

  const isAvailable =
    available === true ||
    available === 'true' ||
    available === 1 ||
    available === '1' ||
    available === undefined;

  return {
    data: {
      itemName: String(itemName).trim(),
      category: uniqueCategories,
      type,
      price: parsedPrice,
      gstPercent: parsedGst,
      available: isAvailable,
    },
  };
};

const listForTenant = async (req) => {
  const items = await FoodItem.find(tenantFilter(req)).sort({ createdAt: -1 }).lean().exec();
  return { items, stats: buildStats(items) };
};

export const getFoodItems = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const { items, stats } = await listForTenant(req);

    return res.status(200).json({
      success: true,
      message: RES_MESSAGE.FOOD.FETCHED,
      items,
      stats,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createFoodItem = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const parsed = parseFoodPayload(req.body);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const item = await new FoodItem({
      ...tenantStamp(req),
      ...parsed.data,
    }).save();

    const { items, stats } = await listForTenant(req);

    return res.status(201).json({
      success: true,
      message: RES_MESSAGE.FOOD.CREATED,
      item: item.toObject(),
      items,
      stats,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFoodItem = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const parsed = parseFoodPayload(req.body);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const item = await FoodItem.findOneAndUpdate(
      { _id: id, ...tenantFilter(req) },
      parsed.data,
      { new: true }
    )
      .lean()
      .exec();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: RES_MESSAGE.FOOD.NOT_FOUND,
      });
    }

    const { items, stats } = await listForTenant(req);

    return res.status(200).json({
      success: true,
      message: RES_MESSAGE.FOOD.UPDATED,
      item,
      items,
      stats,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFoodItem = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const item = await FoodItem.findOneAndDelete({
      _id: id,
      ...tenantFilter(req),
    })
      .lean()
      .exec();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: RES_MESSAGE.FOOD.NOT_FOUND,
      });
    }

    const { items, stats } = await listForTenant(req);

    return res.status(200).json({
      success: true,
      message: RES_MESSAGE.FOOD.DELETED,
      item,
      items,
      stats,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
