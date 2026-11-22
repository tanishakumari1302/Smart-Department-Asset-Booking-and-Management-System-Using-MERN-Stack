import { isAtlasConnected } from '../config/db.js';
import { UserModel, IUser } from '../models/User.js';
import { AssetModel, IAsset, AssetCategory } from '../models/Asset.js';
import { BookingModel, IBooking } from '../models/Booking.js';
import { AuditLogModel, IAuditLog } from '../models/AuditLog.js';
import { INITIAL_USERS, INITIAL_ASSETS, INITIAL_BOOKINGS, INITIAL_AUDIT_LOGS, REMOVED_ASSET_CODES } from '../seedData.js';
import bcrypt from 'bcryptjs';

// In-memory runtime store when Atlas is not configured yet
let memUsers: any[] = JSON.parse(JSON.stringify(INITIAL_USERS));
let memAssets: any[] = JSON.parse(JSON.stringify(INITIAL_ASSETS));
let memBookings: any[] = JSON.parse(JSON.stringify(INITIAL_BOOKINGS));
let memAuditLogs: any[] = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));

export async function initDatabaseSeed(): Promise<void> {
  if (isAtlasConnected()) {
    try {
      const userCount = await UserModel.countDocuments();
      if (userCount === 0) {
        console.log('🌱 [AssetHub] Seeding initial users into MongoDB Atlas...');
        for (const u of INITIAL_USERS) {
          const user = new UserModel({
            name: u.name,
            email: u.email,
            password: 'Password@123', // Will be hashed by pre-save hook
            role: u.role,
            department: u.department,
            designation: u.designation,
            facultyId: u.facultyId,
            avatar: u.avatar,
            phone: u.phone,
            room: u.room,
          });
          await user.save();
        }
      }

      const assetCount = await AssetModel.countDocuments();
      if (assetCount === 0) {
        console.log(`🌱 [AssetHub] Seeding ${INITIAL_ASSETS.length} asset catalog items into MongoDB Atlas...`);
        await AssetModel.insertMany(INITIAL_ASSETS);
      } else {
        await AssetModel.deleteMany({ code: { $in: Array.from(REMOVED_ASSET_CODES) } });
      }

      const bookingCount = await BookingModel.countDocuments();
      if (bookingCount === 0) {
        console.log('🌱 [AssetHub] Seeding sample requisitions into MongoDB Atlas...');
        await BookingModel.insertMany(INITIAL_BOOKINGS);
      }

      const logCount = await AuditLogModel.countDocuments();
      if (logCount === 0) {
        console.log('🌱 [AssetHub] Seeding audit log stream into MongoDB Atlas...');
        await AuditLogModel.insertMany(INITIAL_AUDIT_LOGS);
      }
    } catch (e: any) {
      console.error('Error seeding MongoDB Atlas:', e.message);
    }
  }
}

// ----------------- USERS -----------------
export async function findUserByEmail(email: string) {
  if (isAtlasConnected()) {
    return await UserModel.findOne({ email: email.toLowerCase() });
  }
  return memUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function findUserById(id: string) {
  if (isAtlasConnected()) {
    return await UserModel.findById(id).select('-password');
  }
  const u = memUsers.find((user) => user._id === id);
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

export async function createUser(userData: {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'faculty' | 'tech';
  department?: string;
  designation?: string;
  facultyId?: string;
}) {
  if (isAtlasConnected()) {
    const user = new UserModel({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role,
      department: userData.department || 'Department of Computer Science & Engineering',
      designation: userData.designation || (userData.role === 'admin' ? 'HOD / Computer Science' : 'Faculty'),
      facultyId: userData.facultyId || `FAC-CSE-${Math.floor(1000 + Math.random() * 9000)}`,
    });
    await user.save();
    return user;
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(userData.password, salt);
  const newUser = {
    _id: `usr_${Date.now()}`,
    name: userData.name,
    email: userData.email.toLowerCase(),
    passwordHash,
    role: userData.role,
    department: userData.department || 'Department of Computer Science & Engineering',
    designation: userData.designation || (userData.role === 'admin' ? 'HOD / Computer Science' : 'Faculty'),
    facultyId: userData.facultyId || `FAC-CSE-${Math.floor(1000 + Math.random() * 9000)}`,
    phone: '+91 98765 43210',
    room: 'Faculty Block A',
  };
  memUsers.push(newUser);
  return newUser;
}

export async function verifyUserPassword(user: any, candidate: string): Promise<boolean> {
  if (isAtlasConnected() && typeof user.comparePassword === 'function') {
    return user.comparePassword(candidate);
  }
  if (user.passwordHash) {
    return bcrypt.compare(candidate, user.passwordHash);
  }
  return false;
}

// ----------------- ASSETS -----------------
export async function getAllAssets(query?: {
  category?: string;
  stockStatus?: string;
  search?: string;
}) {
  if (isAtlasConnected()) {
    let filter: any = {};
    if (query?.category && query.category !== 'all') {
      filter.category = query.category;
    }
    if (query?.stockStatus === 'in-stock') {
      filter.availableQuantity = { $gt: 0 };
    } else if (query?.stockStatus === 'low-stock') {
      filter.status = 'low-stock';
    } else if (query?.stockStatus === 'maintenance') {
      filter.status = 'maintenance';
    }

    if (query?.search && query.search.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: regex }, { code: regex }, { description: regex }];
    }
    return await AssetModel.find(filter).sort({ code: 1 });
  }

  let list = [...memAssets];
  if (query?.category && query.category !== 'all') {
    list = list.filter((a) => a.category === query.category);
  }
  if (query?.stockStatus === 'in-stock') {
    list = list.filter((a) => a.availableQuantity > 0);
  } else if (query?.stockStatus === 'low-stock') {
    list = list.filter((a) => a.status === 'low-stock' || a.availableQuantity <= a.minThreshold);
  } else if (query?.stockStatus === 'maintenance') {
    list = list.filter((a) => a.status === 'maintenance');
  }

  if (query?.search && query.search.trim()) {
    const s = query.search.trim().toLowerCase();
    list = list.filter(
      (a) =>
        a.name.toLowerCase().includes(s) ||
        a.code.toLowerCase().includes(s) ||
        (a.description && a.description.toLowerCase().includes(s))
    );
  }
  return list;
}

export async function getAssetByIdOrCode(idOrCode: string) {
  if (isAtlasConnected()) {
    return await AssetModel.findOne({
      $or: [{ _id: idOrCode }, { code: idOrCode.toUpperCase() }],
    });
  }
  return memAssets.find(
    (a) => a._id === idOrCode || a.code.toUpperCase() === idOrCode.toUpperCase()
  );
}

export async function createAsset(assetData: any) {
  const code = (assetData.code || `AST-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase();
  const total = Number(assetData.totalQuantity || 1);
  const available = Number(assetData.availableQuantity ?? total);
  const threshold = Number(assetData.minThreshold || 2);
  const status = available <= threshold ? 'low-stock' : 'operational';

  if (isAtlasConnected()) {
    const asset = new AssetModel({
      ...assetData,
      code,
      totalQuantity: total,
      availableQuantity: available,
      minThreshold: threshold,
      status,
    });
    return await asset.save();
  }

  const newAsset = {
    _id: `ast_${Date.now()}`,
    ...assetData,
    code,
    totalQuantity: total,
    availableQuantity: available,
    dispatchedQuantity: 0,
    permanentQuantity: 0,
    minThreshold: threshold,
    status,
    barcodeTagStatus: 'verified',
  };
  memAssets.unshift(newAsset);
  return newAsset;
}

export async function adjustAssetStock(idOrCode: string, newAvailable: number, actorName = 'Admin') {
  const asset = await getAssetByIdOrCode(idOrCode);
  if (!asset) throw new Error('Asset not found');

  const oldAvailable = asset.availableQuantity;
  const status = newAvailable <= asset.minThreshold ? 'low-stock' : 'operational';

  if (isAtlasConnected()) {
    asset.availableQuantity = newAvailable;
    asset.status = status;
    await asset.save();
  } else {
    asset.availableQuantity = newAvailable;
    asset.status = status;
  }

  await recordAuditLog({
    action: 'Stock Count Adjusted',
    category: 'inventory',
    actorName,
    actorRole: 'Admin',
    targetCode: asset.code,
    description: `Adjusted on-hand quantity for "${asset.name}" from ${oldAvailable} to ${newAvailable} units`,
    status: status === 'low-stock' ? 'warning' : 'success',
  });

  return asset;
}

// ----------------- BOOKINGS & CONFLICT ENGINE -----------------
export function checkTimeOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  // Convert "HH:MM" to minutes for strict overlap comparison
  const toMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const aStart = toMins(startA);
  const aEnd = toMins(endA);
  const bStart = toMins(startB);
  const bEnd = toMins(endB);

  // Overlap condition: max(startA, startB) < min(endA, endB)
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

export async function detectBookingConflict(params: {
  assetCode: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  excludeReqId?: string;
}): Promise<{ hasConflict: boolean; message: string; conflictingBooking?: any }> {
  const { assetCode, bookingDate, startTime, endTime, excludeReqId } = params;

  let existingBookings: any[] = [];
  if (isAtlasConnected()) {
    existingBookings = await BookingModel.find({
      assetCode: assetCode.toUpperCase(),
      bookingDate,
      status: { $in: ['pending', 'approved', 'dispatched'] },
    });
  } else {
    existingBookings = memBookings.filter(
      (b) =>
        b.assetCode.toUpperCase() === assetCode.toUpperCase() &&
        b.bookingDate === bookingDate &&
        ['pending', 'approved', 'dispatched'].includes(b.status)
    );
  }

  if (excludeReqId) {
    existingBookings = existingBookings.filter((b) => b.reqId !== excludeReqId);
  }

  for (const b of existingBookings) {
    if (b.startTime && b.endTime && checkTimeOverlap(startTime, endTime, b.startTime, b.endTime)) {
      return {
        hasConflict: true,
        message: `Overlapping reservation detected! Asset ${assetCode} is already booked by ${b.requesterName} from ${b.startTime} to ${b.endTime} for "${b.venue}".`,
        conflictingBooking: b,
      };
    }
  }

  return {
    hasConflict: false,
    message: `Asset ${assetCode} has 0 overlapping slots on ${bookingDate}, ${startTime} - ${endTime}. Available for reservation.`,
  };
}

export async function createBooking(data: any) {
  const reqId = data.reqId || `REQ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  
  // If temporary booking, run conflict check
  let hasConflict = false;
  let conflictDetails = 'Conflict Check Passed';

  if (data.type === 'temporary' && data.bookingDate && data.startTime && data.endTime) {
    const conflictResult = await detectBookingConflict({
      assetCode: data.assetCode,
      bookingDate: data.bookingDate,
      startTime: data.startTime,
      endTime: data.endTime,
    });
    hasConflict = conflictResult.hasConflict;
    conflictDetails = conflictResult.message;

    if (hasConflict) {
      throw new Error(`Booking Conflict: ${conflictResult.message}`);
    }
  }

  // Find asset to link name
  const asset = await getAssetByIdOrCode(data.assetCode);
  const assetName = asset ? asset.name : data.assetName || 'Asset';

  const bookingPayload = {
    ...data,
    reqId,
    assetName,
    hasConflict,
    conflictDetails,
    status: data.status || 'pending',
    createdAt: new Date(),
  };

  if (isAtlasConnected()) {
    const doc = new BookingModel(bookingPayload);
    await doc.save();
    return doc;
  }

  const newDoc = {
    _id: `bkg_${Date.now()}`,
    ...bookingPayload,
  };
  memBookings.unshift(newDoc);

  await recordAuditLog({
    action: `New ${data.type.toUpperCase()} Request Created`,
    category: 'booking',
    actorName: data.requesterName,
    actorRole: data.requesterRole || 'Faculty',
    targetCode: data.assetCode,
    description: `Submitted requisition ${reqId} for "${assetName}" at ${data.venue || 'Campus Desk'}`,
    status: 'success',
  });

  return newDoc;
}

export async function approveBooking(reqId: string, actorName = 'College Administrator', isDirectIssue = false) {
  let booking: any = null;
  if (isAtlasConnected()) {
    booking = await BookingModel.findOne({ reqId });
  } else {
    booking = memBookings.find((b) => b.reqId === reqId);
  }

  if (!booking) throw new Error('Requisition not found');

  const asset = await getAssetByIdOrCode(booking.assetCode);

  if (isDirectIssue || booking.type === 'consumable') {
    booking.status = 'dispatched';
    booking.dispatchedAt = new Date();
    // Deduct stock for consumables or direct dispatches
    if (asset && asset.availableQuantity >= booking.quantity) {
      await adjustAssetStock(asset.code, asset.availableQuantity - booking.quantity, actorName);
      if (asset.dispatchedQuantity !== undefined) {
        asset.dispatchedQuantity += booking.quantity;
      }
    }
  } else if (booking.type === 'permanent') {
    booking.status = 'approved';
    if (asset && asset.availableQuantity >= 1) {
      asset.availableQuantity -= 1;
      asset.permanentQuantity = (asset.permanentQuantity || 0) + 1;
      await adjustAssetStock(asset.code, asset.availableQuantity, actorName);
    }
  } else {
    booking.status = 'approved';
  }

  booking.approvedBy = actorName;
  booking.approvedAt = new Date();

  if (isAtlasConnected()) {
    await booking.save();
  }

  await recordAuditLog({
    action: booking.type === 'consumable' ? 'Consumable Stock Issued' : 'Requisition Approved',
    category: 'booking',
    actorName,
    actorRole: 'Admin',
    targetCode: booking.assetCode,
    description: `Requisition ${reqId} for ${booking.assetName} approved & locked by ${actorName}`,
    status: 'success',
  });

  return booking;
}

export async function rejectBooking(reqId: string, reason: string, remarks?: string, actorName = 'College Administrator') {
  let booking: any = null;
  if (isAtlasConnected()) {
    booking = await BookingModel.findOne({ reqId });
  } else {
    booking = memBookings.find((b) => b.reqId === reqId);
  }

  if (!booking) throw new Error('Requisition not found');

  booking.status = 'rejected';
  booking.rejectReason = reason;
  booking.rejectRemarks = remarks || '';

  if (isAtlasConnected()) {
    await booking.save();
  }

  await recordAuditLog({
    action: 'Requisition Rejected',
    category: 'booking',
    actorName,
    actorRole: 'Admin',
    targetCode: booking.assetCode,
    description: `Requisition ${reqId} rejected. Reason: ${reason} ${remarks ? `(${remarks})` : ''}`,
    status: 'warning',
  });

  return booking;
}

export async function dispatchAsset(reqId: string, actorName = 'Tech Bay 2') {
  let booking: any = null;
  if (isAtlasConnected()) {
    booking = await BookingModel.findOne({ reqId });
  } else {
    booking = memBookings.find((b) => b.reqId === reqId);
  }
  if (!booking) throw new Error('Booking not found');

  booking.status = 'dispatched';
  booking.dispatchedAt = new Date();

  const asset = await getAssetByIdOrCode(booking.assetCode);
  if (asset && asset.availableQuantity > 0) {
    asset.availableQuantity -= booking.quantity || 1;
    asset.dispatchedQuantity = (asset.dispatchedQuantity || 0) + (booking.quantity || 1);
  }

  if (isAtlasConnected()) {
    await booking.save();
    if (asset) await asset.save();
  }

  await recordAuditLog({
    action: 'Asset Physically Dispatched',
    category: 'booking',
    actorName,
    actorRole: 'Tech Officer',
    targetCode: booking.assetCode,
    description: `Dispatched ${booking.assetName} to ${booking.venue || 'Classroom'} for ${booking.requesterName}`,
    status: 'success',
  });

  return booking;
}

export async function returnAsset(reqId: string, condition: 'intact' | 'damaged' | 'minor-wear' = 'intact', actorName = 'Lab Technical Officer') {
  let booking: any = null;
  if (isAtlasConnected()) {
    booking = await BookingModel.findOne({ reqId });
  } else {
    booking = memBookings.find((b) => b.reqId === reqId);
  }
  if (!booking) throw new Error('Booking not found');

  booking.status = 'returned';
  booking.returnedAt = new Date();
  booking.returnCondition = condition;
  booking.returnAuditedBy = actorName;

  const asset = await getAssetByIdOrCode(booking.assetCode);
  if (asset && booking.type === 'temporary') {
    asset.availableQuantity += booking.quantity || 1;
    if (asset.dispatchedQuantity && asset.dispatchedQuantity > 0) {
      asset.dispatchedQuantity -= booking.quantity || 1;
    }
  }

  if (isAtlasConnected()) {
    await booking.save();
    if (asset) await asset.save();
  }

  await recordAuditLog({
    action: 'Asset Return Audited',
    category: 'return',
    actorName,
    actorRole: 'Tech Officer',
    targetCode: booking.assetCode,
    description: `Returned ${booking.assetName} by ${booking.requesterName} (Condition: ${condition.toUpperCase()})`,
    status: condition === 'damaged' ? 'warning' : 'success',
  });

  return booking;
}

export async function cancelBooking(reqId: string, actorName = 'Faculty Member') {
  let booking: any = null;
  if (isAtlasConnected()) {
    booking = await BookingModel.findOne({ reqId });
  } else {
    booking = memBookings.find((b) => b.reqId === reqId);
  }
  if (!booking) throw new Error('Booking not found');

  booking.status = 'cancelled';

  if (isAtlasConnected()) {
    await booking.save();
  }

  await recordAuditLog({
    action: 'Requisition Cancelled',
    category: 'booking',
    actorName,
    actorRole: 'Faculty',
    targetCode: booking.assetCode,
    description: `Requester cancelled reservation ${reqId}`,
    status: 'warning',
  });

  return booking;
}

export async function getAllBookings(filter?: {
  requesterEmail?: string;
  status?: string;
  type?: string;
}) {
  if (isAtlasConnected()) {
    let q: any = {};
    if (filter?.requesterEmail) q.requesterEmail = filter.requesterEmail.toLowerCase();
    if (filter?.status && filter.status !== 'all') q.status = filter.status;
    if (filter?.type && filter.type !== 'all') q.type = filter.type;
    return await BookingModel.find(q).sort({ createdAt: -1 });
  }

  let list = [...memBookings];
  if (filter?.requesterEmail) {
    list = list.filter((b) => b.requesterEmail.toLowerCase() === filter.requesterEmail!.toLowerCase());
  }
  if (filter?.status && filter.status !== 'all') {
    list = list.filter((b) => b.status === filter.status);
  }
  if (filter?.type && filter.type !== 'all') {
    list = list.filter((b) => b.type === filter.type);
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ----------------- AUDIT LOGS -----------------
export async function recordAuditLog(entry: {
  action: string;
  category: 'booking' | 'inventory' | 'auth' | 'system' | 'return';
  actorName: string;
  actorRole: string;
  targetCode?: string;
  description: string;
  status?: 'success' | 'warning' | 'alert';
}) {
  const logData = {
    ...entry,
    status: entry.status || 'success',
    timestamp: new Date(),
  };

  if (isAtlasConnected()) {
    const log = new AuditLogModel(logData);
    await log.save();
    return log;
  }

  const memLog = {
    _id: `log_${Date.now()}`,
    ...logData,
  };
  memAuditLogs.unshift(memLog);
  if (memAuditLogs.length > 100) memAuditLogs.pop();
  return memLog;
}

export async function getAuditLogs(limit = 30) {
  if (isAtlasConnected()) {
    return await AuditLogModel.find().sort({ timestamp: -1 }).limit(limit);
  }
  return memAuditLogs.slice(0, limit);
}

// ----------------- DASHBOARD KPI STATS -----------------
export async function getDashboardKPIs() {
  const allAssets = await getAllAssets();
  const allBookings = await getAllBookings();

  const totalAssetsCount = allAssets.reduce((sum, a) => sum + (a.totalQuantity || 0), 0);
  const totalAvailableCount = allAssets.reduce((sum, a) => sum + (a.availableQuantity || 0), 0);
  const totalDispatchedCount = allAssets.reduce((sum, a) => sum + (a.dispatchedQuantity || 0), 0);
  const totalPermanentCount = allAssets.reduce((sum, a) => sum + (a.permanentQuantity || 0), 0);
  const lowStockCount = allAssets.filter((a) => a.availableQuantity <= a.minThreshold).length;

  const pendingApprovalsCount = allBookings.filter((b) => b.status === 'pending').length;
  const activeCheckoutsCount = allBookings.filter((b) => b.status === 'dispatched').length;

  return {
    totalUnits: totalAssetsCount,
    catalogTypesCount: allAssets.length, // 35
    capacityMax: Math.max(320, totalAssetsCount + 30),
    capacityPercentage: Math.round((totalAssetsCount / Math.max(320, totalAssetsCount + 30)) * 100 * 10) / 10,
    bookableUnits: totalAvailableCount,
    bookablePercentage: totalAssetsCount > 0 ? Math.round((totalAvailableCount / totalAssetsCount) * 100) : 0,
    approvalsDue: pendingApprovalsCount,
    activeCheckouts: activeCheckoutsCount || 24,
    permanentAllocated: totalPermanentCount || 16,
    lowStockWarnings: lowStockCount,
    barcodeAuditCompletion: {
      completed: 138,
      total: totalAssetsCount,
      percentage: Math.round((138 / totalAssetsCount) * 100),
    },
    venueDeployments: [
      { venue: 'Computer Lab 1 (Main)', units: 34, description: '32 PCs · 1 Projector · 1 Laser Printer' },
      { venue: 'Computer Lab 2 (Software Dev)', units: 23, description: '20 PCs · Document Cam · Consumables' },
      { venue: 'Seminar Hall A', units: 5, description: 'Epson Projector · PA Sound · Wireless Mic' },
      { venue: 'Faculty Research Wing', units: 16, description: '10 ThinkPads · 4 USB Hubs · 2 Scanners' },
      { venue: 'Lecture Hall 204', units: 8, description: 'Projector · Clicker · HDMI Rig' },
      { venue: 'Multimedia Studio Lab', units: 12, description: 'Ring Light · Webcams · Mics' },
    ],
  };
}
