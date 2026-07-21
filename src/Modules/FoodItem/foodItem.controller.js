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
  const items = await FoodItem.find(tenantFilter(req))
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean()
    .exec();
  return { items, stats: buildStats(items) };
};

const nextSortOrder = async (req) => {
  const last = await FoodItem.findOne(tenantFilter(req))
    .sort({ sortOrder: -1 })
    .select('sortOrder')
    .lean()
    .exec();
  return (Number(last?.sortOrder) || 0) + 1;
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
      sortOrder: await nextSortOrder(req),
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

export const reorderFoodItems = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: RES_MESSAGE.VALIDATION.UNAUTHORIZED,
      });
    }

    const orderedIds = Array.isArray(req.body?.orderedIds)
      ? req.body.orderedIds.map((id) => String(id).trim()).filter(Boolean)
      : [];

    if (!orderedIds.length) {
      return res.status(400).json({
        success: false,
        message: 'orderedIds array is required',
      });
    }

    const filter = tenantFilter(req);
    const existing = await FoodItem.find(filter).select('_id').lean().exec();
    const existingIds = new Set(existing.map((item) => String(item._id)));

    if (orderedIds.length !== existing.length) {
      return res.status(400).json({
        success: false,
        message: 'Send the full ordered list of food item ids',
      });
    }

    const uniqueIds = new Set(orderedIds);
    if (uniqueIds.size !== orderedIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate ids in orderedIds',
      });
    }

    if (orderedIds.some((id) => !existingIds.has(id))) {
      return res.status(400).json({
        success: false,
        message: 'One or more food items were not found',
      });
    }

    await Promise.all(
      orderedIds.map((id, index) =>
        FoodItem.updateOne({ _id: id, ...filter }, { $set: { sortOrder: index } }).exec()
      )
    );

    const { items, stats } = await listForTenant(req);

    return res.status(200).json({
      success: true,
      message: RES_MESSAGE.FOOD.REORDERED,
      items,
      stats,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
