import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'faculty' | 'tech';
  department: string;
  designation: string;
  facultyId: string;
  avatar?: string;
  phone?: string;
  room?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'faculty', 'tech'], default: 'faculty' },
    department: { type: String, default: 'Department of Computer Science & Engineering' },
    designation: { type: String, default: 'Faculty' },
    facultyId: { type: String, required: true },
    avatar: { type: String },
    phone: { type: String, default: '+91 98765 43210' },
    room: { type: String, default: 'Faculty Block B, Cabin #04' },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (this: any) {
  if (!this.isModified('password') || !this.password) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err: any) {
    throw err;
  }
});

UserSchema.methods.comparePassword = async function (this: any, candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
