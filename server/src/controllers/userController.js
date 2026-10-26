import User from '../models/User.js';

export const updateProfile = async (req, res, next) => {
  try {
    const { username, address, contactSharingPreference, bloodGroup } = req.body;
    const user = await User.findById(req.user._id);

    if (username) user.username = username.trim();
    if (address !== undefined) user.address = address.trim();
    if (contactSharingPreference) user.contactSharingPreference = contactSharingPreference;
    if (bloodGroup) user.bloodGroup = bloodGroup;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (req, res, next) => {
  try {
    const { coordinates, address } = req.body;

    const lng = Number(coordinates?.[0]);
    const lat = Number(coordinates?.[1]);

    if (
      !Array.isArray(coordinates) ||
      coordinates.length !== 2 ||
      isNaN(lng) ||
      isNaN(lat) ||
      lng < -180 ||
      lng > 180 ||
      lat < -90 ||
      lat > 90
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid coordinates [longitude (-180..180), latitude (-90..90)] are required',
      });
    }

    const user = await User.findById(req.user._id);
    user.location = {
      type: 'Point',
      coordinates: [lng, lat],
    };
    if (address) user.address = address;
    user.locationUpdatedAt = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      location: user.location,
      user: user.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
};

export const updateDonorAvailability = async (req, res, next) => {
  try {
    const { isDonorAvailable } = req.body;

    if (typeof isDonorAvailable !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isDonorAvailable boolean flag is required',
      });
    }

    const user = await User.findById(req.user._id);
    user.isDonorAvailable = isDonorAvailable;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Donor availability set to ${isDonorAvailable ? 'Available' : 'Unavailable'}`,
      isDonorAvailable: user.isDonorAvailable,
      user: user.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
};

export default { updateProfile, updateLocation, updateDonorAvailability };
