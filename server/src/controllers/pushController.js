import PushSubscription from '../models/PushSubscription.js';

export const saveSubscription = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        message: 'Invalid push subscription payload',
      });
    }

    const sub = await PushSubscription.findOneAndUpdate(
      { endpoint },
      { userId: req.user._id, endpoint, keys },
      { upsert: true, new: true }
    );

    return res.status(201).json({
      success: true,
      message: 'Push subscription registered successfully',
      subscription: sub,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    await PushSubscription.findOneAndDelete({ _id: id, userId: req.user._id });

    return res.status(200).json({
      success: true,
      message: 'Push subscription removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export default { saveSubscription, deleteSubscription };
