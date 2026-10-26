import User from '../models/User.js';
import BloodRequest from '../models/BloodRequest.js';
import RequestMatch from '../models/RequestMatch.js';
import AuditLog from '../models/AuditLog.js';
import { REQUEST_STATUS } from '../config/constants.js';

export const getSystemStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeDonors = await User.countDocuments({
      isDonorAvailable: true,
      accountStatus: 'active',
    });
    const totalRequests = await BloodRequest.countDocuments();
    const activeRequests = await BloodRequest.countDocuments({ status: REQUEST_STATUS.ACTIVE });
    const fulfilledRequests = await BloodRequest.countDocuments({ status: REQUEST_STATUS.FULFILLED });
    const totalMatches = await RequestMatch.countDocuments();
    const acceptedMatches = await RequestMatch.countDocuments({ status: 'accepted' });

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeDonors,
        totalRequests,
        activeRequests,
        fulfilledRequests,
        totalMatches,
        acceptedMatches,
        fulfillmentRate: totalRequests > 0 ? Math.round((fulfilledRequests / totalRequests) * 100) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllRequests = async (req, res, next) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const requests = await BloodRequest.find(filter)
      .populate('requester', 'username email mobile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await BloodRequest.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      requests,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const { role, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (role) filter.role = role;

    const skip = (Number(page) - 1) * Number(limit);
    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await User.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      users,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate('performedBy', 'username email role')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

export default { getSystemStats, getAllRequests, getAllUsers, getAuditLogs };
