import React, { useState, useMemo, useEffect } from 'react';
import {
  Asset,
  Booking,
  User,
  AcademicSettings,
  calculateDefaultAcademicYear,
  MarkerColor,
  FacultyCustodyProfile,
  FacultyCustodyItem,
  StockNotificationRequest,
  AUTHORIZED_FACULTY_MEMBERS,
} from '../types';

interface FacultyCustodyStationeryViewProps {
  currentUser?: User | null;
  assets: Asset[];
  bookings: Booking[];
  academicSettings?: AcademicSettings;
  onOpenGatepass?: (booking: Booking) => void;
  showToast: (text: string, type?: 'success' | 'warning' | 'info') => void;
  onSelectNavTab: (tab: any, assetCode?: string) => void;
}

interface FacultyHistoryRecord {
  id: string;
  reqId: string;
  assetCode: string;
  assetName: string;
  category: string;
  color?: MarkerColor;
  quantity: number;
  venue: string;
  date: string;
  timeSlot: string;
  returnCondition: string;
  verifiedBy: string;
  subject: string;
}

export const FacultyCustodyStationeryView: React.FC<FacultyCustodyStationeryViewProps> = ({
  currentUser,
  assets,
  bookings,
  academicSettings,
  onOpenGatepass,
  showToast,
  onSelectNavTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColorFilter, setSelectedColorFilter] = useState<string>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedTeacherModal, setSelectedTeacherModal] = useState<FacultyCustodyProfile | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'current' | 'history'>('current');
  const [activeKpiDetailModal, setActiveKpiDetailModal] = useState<'teachers' | 'units' | 'markers' | 'out-of-stock' | null>(null);

  // 'Notify Me' State
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [selectedNotifyAsset, setSelectedNotifyAsset] = useState<Asset | null>(null);
  const [subscriberEmail, setSubscriberEmail] = useState(currentUser?.email || 'mohini.gupta@sunstone.in');
  const [subscriberName, setSubscriberName] = useState(currentUser?.name || 'Mohini Gupta');
  const [activeSubscribers, setActiveSubscribers] = useState<StockNotificationRequest[]>([
    {
      id: 'sub-01',
      assetCode: 'AST-0002-BLK',
      assetName: 'Whiteboard Marker (Black - Chisel Tip)',
      requesterEmail: 'harsh.katariya@sunstone.in',
      requesterName: 'Harsh Katariya',
      requestedAt: 'Today, 10:15 AM',
      targetVenue: 'VLSI Wing Block C, Cabin 301',
      notified: false,
    },
    {
      id: 'sub-02',
      assetCode: 'AST-0002-BLU',
      assetName: 'Whiteboard Marker (Royal Blue)',
      requesterEmail: 'simran.khera@sunstone.in',
      requesterName: 'Simran Khera',
      requestedAt: 'Today, 10:40 AM',
      targetVenue: 'VLSI Wing Block C, Cabin 302',
      notified: false,
    },
  ]);

  // Automated Email Notification Dispatch Log
  const [emailLogs, setEmailLogs] = useState<
    Array<{ id: string; to: string; subject: string; time: string; details: string }>
  >([]);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTeacherModal(null);
        setActiveKpiDetailModal(null);
        setIsNotifyModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Complete Roster of all 12 Authorized Faculty Members with exactly 40 Units in Circulation
  const [facultyRoster, setFacultyRoster] = useState<FacultyCustodyProfile[]>([
    // 1. Harpreet Aulakh (4 units)
    {
      facultyId: 'usr_fac_harpreet_a',
      facultyName: 'Harpreet Aulakh',
      department: 'Corporate Training & Placement Cell',
      cabin: 'Placement & Corporate Wing, Room 101',
      email: 'harpreet.aulakh@sunstone.in',
      avatar: '/assets/faculty/harpreet_aulakh.jpeg',
      currentVenue: 'Corporate Interview Suite 101',
      currentSession: '09:30 AM – 11:00 AM • Executive Placement Preparation',
      items: [
        {
          id: 'item-01',
          assetCode: 'AST-0002-BLK',
          name: 'Whiteboard Marker (Black)',
          category: 'stationery',
          markerColor: 'black',
          quantity: 1,
          assignedVenue: 'Interview Suite 101',
          sessionStartTime: '09:30 AM',
          sessionEndTime: '11:00 AM',
          status: 'in-use',
        },
        {
          id: 'item-02',
          assetCode: 'AST-0002-BLU',
          name: 'Whiteboard Marker (Blue)',
          category: 'stationery',
          markerColor: 'blue',
          quantity: 1,
          assignedVenue: 'Interview Suite 101',
          sessionStartTime: '09:30 AM',
          sessionEndTime: '11:00 AM',
          status: 'in-use',
        },
        {
          id: 'item-03',
          assetCode: 'AST-0027',
          name: 'Logitech Wireless Presenter & Remote',
          category: 'it',
          quantity: 1,
          assignedVenue: 'Interview Suite 101',
          sessionStartTime: '09:30 AM',
          sessionEndTime: '11:00 AM',
          status: 'in-use',
        },
        {
          id: 'item-04',
          assetCode: 'AST-0003',
          name: 'HDMI 4K 10-Meter Cable Reel',
          category: 'it',
          quantity: 1,
          assignedVenue: 'Interview Suite 101',
          sessionStartTime: '09:30 AM',
          sessionEndTime: '11:00 AM',
          status: 'in-use',
        },
      ],
    },

    // 2. Gaganjit Kaur (3 units)
    {
      facultyId: 'usr_fac_gaganjit',
      facultyName: 'Gaganjit Kaur',
      department: 'Department of Management Studies',
      cabin: 'Management Block, Cabin 201',
      email: 'gaganjit.kaur@sunstone.in',
      avatar: '/assets/faculty/gaganjit_kaur.jpeg',
      currentVenue: 'Executive Classroom 201',
      currentSession: '10:00 AM – 11:30 AM • Brand Strategy & Marketing Insights',
      items: [
        {
          id: 'item-05',
          assetCode: 'AST-0002-BLU',
          name: 'Whiteboard Marker (Blue)',
          category: 'stationery',
          markerColor: 'blue',
          quantity: 2,
          assignedVenue: 'Classroom 201',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
        {
          id: 'item-06',
          assetCode: 'AST-0010',
          name: 'Magnetic Whiteboard Eraser & Duster',
          category: 'stationery',
          quantity: 1,
          assignedVenue: 'Classroom 201',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
      ],
    },

    // 3. Priyanka Dhiman (3 units)
    {
      facultyId: 'usr_fac_priyanka',
      facultyName: 'Priyanka Dhiman',
      department: 'Department of Management Studies',
      cabin: 'Management Block, Cabin 202',
      email: 'priyanka.dhiman@sunstone.in',
      avatar: '/assets/faculty/priyanka_dhiman.jpeg',
      currentVenue: 'MDP Seminar Hall 102',
      currentSession: '10:00 AM – 11:30 AM • Human Resource Dynamics',
      items: [
        {
          id: 'item-07',
          assetCode: 'AST-0002-BLK',
          name: 'Whiteboard Marker (Black)',
          category: 'stationery',
          markerColor: 'black',
          quantity: 1,
          assignedVenue: 'MDP Hall 102',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
        {
          id: 'item-08',
          assetCode: 'AST-0002-RED',
          name: 'Whiteboard Marker (Red)',
          category: 'stationery',
          markerColor: 'red',
          quantity: 1,
          assignedVenue: 'MDP Hall 102',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
        {
          id: 'item-09',
          assetCode: 'AST-0028',
          name: 'Targus Red Laser Pointer Pen',
          category: 'it',
          quantity: 1,
          assignedVenue: 'MDP Hall 102',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
      ],
    },

    // 4. Surbhi Sharma (3 units)
    {
      facultyId: 'usr_fac_surbhi',
      facultyName: 'Surbhi Sharma',
      department: 'Department of Management Studies',
      cabin: 'Management Block, Cabin 203',
      email: 'surbhi.sharma@sunstone.in',
      avatar: '/assets/faculty/surbhi_sharma.jpeg',
      currentVenue: 'Management Lecture Hall 3',
      currentSession: '10:30 AM – 12:00 PM • Managerial Economics Practical',
      items: [
        {
          id: 'item-10',
          assetCode: 'AST-0002-RED',
          name: 'Whiteboard Marker (Red)',
          category: 'stationery',
          markerColor: 'red',
          quantity: 1,
          assignedVenue: 'Lecture Hall 3',
          sessionStartTime: '10:30 AM',
          sessionEndTime: '12:00 PM',
          status: 'in-use',
        },
        {
          id: 'item-11',
          assetCode: 'AST-0002-BLK',
          name: 'Whiteboard Marker (Black)',
          category: 'stationery',
          markerColor: 'black',
          quantity: 1,
          assignedVenue: 'Lecture Hall 3',
          sessionStartTime: '10:30 AM',
          sessionEndTime: '12:00 PM',
          status: 'in-use',
        },
        {
          id: 'item-12',
          assetCode: 'AST-0029',
          name: 'Portable Bluetooth Classroom Speaker',
          category: 'audio',
          quantity: 1,
          assignedVenue: 'Lecture Hall 3',
          sessionStartTime: '10:30 AM',
          sessionEndTime: '12:00 PM',
          status: 'in-use',
        },
      ],
    },

    // 5. Archana Salaria (4 units)
    {
      facultyId: 'usr_fac_archana',
      facultyName: 'Archana Salaria',
      department: 'Department of Computer Science & Engineering',
      cabin: 'Tech Academic Block A, Cabin 301',
      email: 'archana.salaria@sunstone.in',
      avatar: '/assets/faculty/archana_salaria.jpeg',
      currentVenue: 'Cloud Computing Lab 01',
      currentSession: '11:00 AM – 12:30 PM • Distributed Systems Architecture',
      items: [
        {
          id: 'item-13',
          assetCode: 'AST-0002-BLK',
          name: 'Whiteboard Marker (Black)',
          category: 'stationery',
          markerColor: 'black',
          quantity: 2,
          assignedVenue: 'Cloud Lab 01',
          sessionStartTime: '11:00 AM',
          sessionEndTime: '12:30 PM',
          status: 'in-use',
        },
        {
          id: 'item-14',
          assetCode: 'AST-0002-GRN',
          name: 'Whiteboard Marker (Green)',
          category: 'stationery',
          markerColor: 'green',
          quantity: 1,
          assignedVenue: 'Cloud Lab 01',
          sessionStartTime: '11:00 AM',
          sessionEndTime: '12:30 PM',
          status: 'in-use',
        },
        {
          id: 'item-15',
          assetCode: 'AST-0003',
          name: 'HDMI 4K 10-Meter Cable Reel',
          category: 'it',
          quantity: 1,
          assignedVenue: 'Cloud Lab 01',
          sessionStartTime: '11:00 AM',
          sessionEndTime: '12:30 PM',
          status: 'in-use',
        },
      ],
    },

    // 6. Bhawana Saini (3 units)
    {
      facultyId: 'usr_fac_bhawana',
      facultyName: 'Bhawana Saini',
      department: 'Department of Computer Science & Engineering',
      cabin: 'Tech Academic Block A, Cabin 302',
      email: 'bhawana.saini@sunstone.in',
      avatar: '/assets/faculty/bhawana_saini.jpeg',
      currentVenue: 'Software Engineering Lab 03',
      currentSession: '10:00 AM – 11:30 AM • Full-Stack Development Lab',
      items: [
        {
          id: 'item-16',
          assetCode: 'AST-0002-BLK',
          name: 'Whiteboard Marker (Black)',
          category: 'stationery',
          markerColor: 'black',
          quantity: 1,
          assignedVenue: 'Software Lab 03',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
        {
          id: 'item-17',
          assetCode: 'AST-0002-BLU',
          name: 'Whiteboard Marker (Blue)',
          category: 'stationery',
          markerColor: 'blue',
          quantity: 1,
          assignedVenue: 'Software Lab 03',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
        {
          id: 'item-18',
          assetCode: 'AST-0027',
          name: 'Wireless Presentation Clicker Remote',
          category: 'it',
          quantity: 1,
          assignedVenue: 'Software Lab 03',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
      ],
    },

    // 7. Harpreet Kaur (4 units)
    {
      facultyId: 'usr_fac_harpreet_k',
      facultyName: 'Harpreet Kaur',
      department: 'Corporate Training & Placement Cell',
      cabin: 'Corporate Training Studio 1',
      email: 'harpreet.kaur@sunstone.in',
      avatar: '/assets/faculty/harpreet_kaur.jpeg',
      currentVenue: 'Corporate Training Studio 1',
      currentSession: '10:00 AM – 12:00 PM • Soft Skills & Group Discussion Drill',
      items: [
        {
          id: 'item-19',
          assetCode: 'AST-0002-BLK',
          name: 'Whiteboard Marker (Black)',
          category: 'stationery',
          markerColor: 'black',
          quantity: 1,
          assignedVenue: 'Studio 1',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '12:00 PM',
          status: 'in-use',
        },
        {
          id: 'item-20',
          assetCode: 'AST-0002-GRN',
          name: 'Whiteboard Marker (Green)',
          category: 'stationery',
          markerColor: 'green',
          quantity: 1,
          assignedVenue: 'Studio 1',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '12:00 PM',
          status: 'in-use',
        },
        {
          id: 'item-21',
          assetCode: 'AST-0004',
          name: 'Wireless Lapel Microphone Kit',
          category: 'audio',
          quantity: 1,
          assignedVenue: 'Studio 1',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '12:00 PM',
          status: 'in-use',
        },
        {
          id: 'item-22',
          assetCode: 'AST-0030',
          name: 'Logitech HD 1080p Web Conferencing Camera',
          category: 'recording',
          quantity: 1,
          assignedVenue: 'Studio 1',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '12:00 PM',
          status: 'in-use',
        },
      ],
    },

    // 8. Jahanvi Garg (3 units)
    {
      facultyId: 'usr_fac_jahanvi',
      facultyName: 'Jahanvi Garg',
      department: 'Training & Skill Development Cell',
      cabin: 'Aptitude Lab Wing, Cabin 104',
      email: 'jahanvi.garg@sunstone.in',
      avatar: '/assets/faculty/jahanvi_garg.jpeg',
      currentVenue: 'Aptitude Training Lab 104',
      currentSession: '09:30 AM – 11:00 AM • Quantitative Aptitude Speed Test',
      items: [
        {
          id: 'item-23',
          assetCode: 'AST-0002-BLK',
          name: 'Whiteboard Marker (Black)',
          category: 'stationery',
          markerColor: 'black',
          quantity: 1,
          assignedVenue: 'Lab 104',
          sessionStartTime: '09:30 AM',
          sessionEndTime: '11:00 AM',
          status: 'in-use',
        },
        {
          id: 'item-24',
          assetCode: 'AST-0002-BLU',
          name: 'Whiteboard Marker (Blue)',
          category: 'stationery',
          markerColor: 'blue',
          quantity: 1,
          assignedVenue: 'Lab 104',
          sessionStartTime: '09:30 AM',
          sessionEndTime: '11:00 AM',
          status: 'in-use',
        },
        {
          id: 'item-25',
          assetCode: 'AST-0031',
          name: 'Scientific Calculator Master Kit (Casio)',
          category: 'it',
          quantity: 1,
          assignedVenue: 'Lab 104',
          sessionStartTime: '09:30 AM',
          sessionEndTime: '11:00 AM',
          status: 'in-use',
        },
      ],
    },

    // 9. Adil Raja (4 units)
    {
      facultyId: 'usr_fac_adil',
      facultyName: 'Adil Raja',
      department: 'Department of Computer Science & Engineering',
      cabin: 'Tech Academic Block A, Cabin 204',
      email: 'adil.raja@sunstone.in',
      avatar: '/assets/faculty/adil_raja.jpeg',
      currentVenue: 'Main Auditorium Annex',
      currentSession: '10:00 AM – 11:30 AM • Advanced Algorithms & Data Mining Lecture',
      items: [
        {
          id: 'item-26',
          assetCode: 'AST-0002-BLK',
          name: 'Whiteboard Marker (Black)',
          category: 'stationery',
          markerColor: 'black',
          quantity: 2,
          assignedVenue: 'Auditorium Annex',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
        {
          id: 'item-27',
          assetCode: 'AST-0002-RED',
          name: 'Whiteboard Marker (Red)',
          category: 'stationery',
          markerColor: 'red',
          quantity: 1,
          assignedVenue: 'Auditorium Annex',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
        {
          id: 'item-28',
          assetCode: 'AST-0001',
          name: 'Epson PowerLite Laser Projector 5000L',
          category: 'it',
          quantity: 1,
          assignedVenue: 'Auditorium Annex',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
      ],
    },

    // 10. Simran Khera (3 units)
    {
      facultyId: 'usr_fac_simran',
      facultyName: 'Simran Khera',
      department: 'Department of Electronics & Communication',
      cabin: 'VLSI Wing Block C, Cabin 302',
      email: 'simran.khera@sunstone.in',
      avatar: '/assets/faculty/simran_khera.jpeg',
      currentVenue: 'Analog & VLSI Lab 02',
      currentSession: '11:00 AM – 12:30 PM • Digital Signal Processing Lab',
      items: [
        {
          id: 'item-29',
          assetCode: 'AST-0002-BLK',
          name: 'Whiteboard Marker (Black)',
          category: 'stationery',
          markerColor: 'black',
          quantity: 1,
          assignedVenue: 'VLSI Lab 02',
          sessionStartTime: '11:00 AM',
          sessionEndTime: '12:30 PM',
          status: 'in-use',
        },
        {
          id: 'item-30',
          assetCode: 'AST-0002-BLU',
          name: 'Whiteboard Marker (Blue)',
          category: 'stationery',
          markerColor: 'blue',
          quantity: 1,
          assignedVenue: 'VLSI Lab 02',
          sessionStartTime: '11:00 AM',
          sessionEndTime: '12:30 PM',
          status: 'in-use',
        },
        {
          id: 'item-31',
          assetCode: 'AST-0041',
          name: 'Fluke Precision Digital Multimeter Set',
          category: 'it',
          quantity: 1,
          assignedVenue: 'VLSI Lab 02',
          sessionStartTime: '11:00 AM',
          sessionEndTime: '12:30 PM',
          status: 'in-use',
        },
      ],
    },

    // 11. Harsh Katariya (3 units)
    {
      facultyId: 'usr_fac_harsh',
      facultyName: 'Harsh Katariya',
      department: 'Department of Electronics & Communication',
      cabin: 'VLSI Wing Block C, Cabin 301',
      email: 'harsh.katariya@sunstone.in',
      avatar: '/assets/faculty/harsh_katariya.jpeg',
      currentVenue: 'Embedded Systems Testing Bay',
      currentSession: '10:30 AM – 12:00 PM • IoT Sensor Protocols & Firmware',
      items: [
        {
          id: 'item-32',
          assetCode: 'AST-0002-BLK',
          name: 'Whiteboard Marker (Black)',
          category: 'stationery',
          markerColor: 'black',
          quantity: 1,
          assignedVenue: 'Embedded Bay',
          sessionStartTime: '10:30 AM',
          sessionEndTime: '12:00 PM',
          status: 'in-use',
        },
        {
          id: 'item-33',
          assetCode: 'AST-0002-GRN',
          name: 'Whiteboard Marker (Green)',
          category: 'stationery',
          markerColor: 'green',
          quantity: 1,
          assignedVenue: 'Embedded Bay',
          sessionStartTime: '10:30 AM',
          sessionEndTime: '12:00 PM',
          status: 'in-use',
        },
        {
          id: 'item-34',
          assetCode: 'AST-0032',
          name: 'Anker USB-C 8-in-1 Dual Display Dock',
          category: 'it',
          quantity: 1,
          assignedVenue: 'Embedded Bay',
          sessionStartTime: '10:30 AM',
          sessionEndTime: '12:00 PM',
          status: 'in-use',
        },
      ],
    },

    // 12. Mohini Gupta (3 units)
    {
      facultyId: 'usr_fac_mohini',
      facultyName: 'Mohini Gupta',
      department: 'Department of Computer Science & Engineering',
      cabin: 'Tech Academic Block A, Cabin 201',
      email: 'mohini.gupta@sunstone.in',
      avatar: '/assets/faculty/mohini_gupta.jpeg',
      currentVenue: 'Digital Design Studio 204',
      currentSession: '10:00 AM – 11:30 AM • UI/UX Design & Human Factors',
      items: [
        {
          id: 'item-35',
          assetCode: 'AST-0002-RED',
          name: 'Whiteboard Marker (Red)',
          category: 'stationery',
          markerColor: 'red',
          quantity: 1,
          assignedVenue: 'Design Studio 204',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
        {
          id: 'item-36',
          assetCode: 'AST-0002-GRN',
          name: 'Whiteboard Marker (Green)',
          category: 'stationery',
          markerColor: 'green',
          quantity: 1,
          assignedVenue: 'Design Studio 204',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
        {
          id: 'item-37',
          assetCode: 'AST-0025',
          name: 'Wacom Pro Pen 2 Precision Stylus Kit',
          category: 'it',
          quantity: 1,
          assignedVenue: 'Design Studio 204',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
      ],
    },

    // 13. Ms. Kavita Thakur
    {
      facultyId: 'usr_fac_kavita',
      facultyName: 'Ms. Kavita Thakur',
      department: 'Training & Skill Development Cell',
      cabin: 'Student Guidance Wing, Cabin 304',
      email: 'kavita.thakur@sunstone.in',
      avatar: '/assets/faculty/kavita_thakur.jpeg',
      currentVenue: 'Counseling & Guidance Hall B-2',
      currentSession: '10:00 AM – 11:30 AM • Career Guidance & Student Mentorship',
      items: [
        {
          id: 'item-38',
          assetCode: 'AST-0002-BLK',
          name: 'Whiteboard Marker (Black)',
          category: 'stationery',
          markerColor: 'black',
          quantity: 1,
          assignedVenue: 'Counseling Hall B-2',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
        {
          id: 'item-39',
          assetCode: 'AST-0002-RED',
          name: 'Whiteboard Marker (Red)',
          category: 'stationery',
          markerColor: 'red',
          quantity: 1,
          assignedVenue: 'Counseling Hall B-2',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
        {
          id: 'item-40',
          assetCode: 'AST-0028',
          name: 'Targus Wireless Presenter & Stylus',
          category: 'it',
          quantity: 1,
          assignedVenue: 'Counseling Hall B-2',
          sessionStartTime: '10:00 AM',
          sessionEndTime: '11:30 AM',
          status: 'in-use',
        },
      ],
    },

    // 14. Ms. Rhythm Dua
    {
      facultyId: 'usr_fac_rhythm',
      facultyName: 'Ms. Rhythm Dua',
      department: 'Corporate Training & Placement Cell',
      cabin: 'Executive Suite 102, Main Admin Block',
      email: 'rhythm.dua@sunstone.in',
      avatar: '/assets/faculty/rhythm_dua.jpeg',
      currentVenue: 'Corporate Alliance Boardroom 1',
      currentSession: '11:00 AM – 12:30 PM • Industry Corporate Alliances & Placement Drives',
      items: [
        {
          id: 'item-41',
          assetCode: 'AST-0002-BLU',
          name: 'Whiteboard Marker (Blue)',
          category: 'stationery',
          markerColor: 'blue',
          quantity: 1,
          assignedVenue: 'Boardroom 1',
          sessionStartTime: '11:00 AM',
          sessionEndTime: '12:30 PM',
          status: 'in-use',
        },
        {
          id: 'item-42',
          assetCode: 'AST-0002-GRN',
          name: 'Whiteboard Marker (Green)',
          category: 'stationery',
          markerColor: 'green',
          quantity: 1,
          assignedVenue: 'Boardroom 1',
          sessionStartTime: '11:00 AM',
          sessionEndTime: '12:30 PM',
          status: 'in-use',
        },
        {
          id: 'item-43',
          assetCode: 'AST-0027',
          name: 'HDMI 4K Adapter & Audio Link Kit',
          category: 'it',
          quantity: 1,
          assignedVenue: 'Boardroom 1',
          sessionStartTime: '11:00 AM',
          sessionEndTime: '12:30 PM',
          status: 'in-use',
        },
      ],
    },
  ]);

  // Master historical database for all 12 teachers
  const facultyHistoryDB = useMemo<Record<string, FacultyHistoryRecord[]>>(() => {
    return {
      usr_fac_harpreet_a: [
        {
          id: 'hist-ha-01',
          reqId: 'REQ-2026-104',
          assetCode: 'AST-0002-BLK',
          assetName: 'Whiteboard Marker (Black)',
          category: 'stationery',
          color: 'black',
          quantity: 2,
          venue: 'Placement Cell Bay 2',
          date: 'Yesterday, 25 Oct 2026',
          timeSlot: '02:00 PM – 03:30 PM',
          returnCondition: 'Intact & Cleaned',
          verifiedBy: 'Malay Aggarwal',
          subject: 'Mock Interview Session B',
        },
        {
          id: 'hist-ha-02',
          reqId: 'REQ-2026-088',
          assetCode: 'AST-0001',
          assetName: 'Epson PowerLite Laser Projector',
          category: 'it',
          quantity: 1,
          venue: 'Auditorium Main Stage',
          date: '22 Oct 2026',
          timeSlot: '10:00 AM – 01:00 PM',
          returnCondition: 'Lens Intact • Cables Packed',
          verifiedBy: 'Arpit Singh',
          subject: 'Campus Placement Orientation',
        },
      ],
      usr_fac_gaganjit: [
        {
          id: 'hist-gk-01',
          reqId: 'REQ-2026-092',
          assetCode: 'AST-0002-RED',
          assetName: 'Whiteboard Marker (Red)',
          category: 'stationery',
          color: 'red',
          quantity: 1,
          venue: 'Room 201',
          date: '24 Oct 2026',
          timeSlot: '11:00 AM – 12:30 PM',
          returnCondition: 'Intact',
          verifiedBy: 'Arpit Singh',
          subject: 'Consumer Behavior Seminar',
        },
      ],
      usr_fac_priyanka: [
        {
          id: 'hist-pd-01',
          reqId: 'REQ-2026-095',
          assetCode: 'AST-0027',
          assetName: 'Logitech Wireless Clicker',
          category: 'it',
          quantity: 1,
          venue: 'MDP Hall 102',
          date: '23 Oct 2026',
          timeSlot: '02:30 PM – 04:00 PM',
          returnCondition: 'USB Receiver Returned',
          verifiedBy: 'Malay Aggarwal',
          subject: 'Organizational Leadership',
        },
      ],
      usr_fac_surbhi: [
        {
          id: 'hist-ss-01',
          reqId: 'REQ-2026-079',
          assetCode: 'AST-0002-BLU',
          assetName: 'Whiteboard Marker (Blue)',
          category: 'stationery',
          color: 'blue',
          quantity: 2,
          venue: 'Classroom 203',
          date: '21 Oct 2026',
          timeSlot: '09:00 AM – 10:30 AM',
          returnCondition: 'Intact',
          verifiedBy: 'Arpit Singh',
          subject: 'Business Analytics Case Study',
        },
      ],
      usr_fac_archana: [
        {
          id: 'hist-as-01',
          reqId: 'REQ-2026-101',
          assetCode: 'AST-0003',
          assetName: 'HDMI 4K Cable',
          category: 'it',
          quantity: 1,
          venue: 'Cloud Lab 01',
          date: '24 Oct 2026',
          timeSlot: '10:00 AM – 12:00 PM',
          returnCondition: 'Coiled & Verified',
          verifiedBy: 'Malay Aggarwal',
          subject: 'Kubernetes Hands-on Lab',
        },
      ],
      usr_fac_bhawana: [
        {
          id: 'hist-bs-01',
          reqId: 'REQ-2026-084',
          assetCode: 'AST-0002-GRN',
          assetName: 'Whiteboard Marker (Green)',
          category: 'stationery',
          color: 'green',
          quantity: 1,
          venue: 'Software Lab 03',
          date: '22 Oct 2026',
          timeSlot: '01:00 PM – 02:30 PM',
          returnCondition: 'Intact',
          verifiedBy: 'Arpit Singh',
          subject: 'React & TypeScript Lab',
        },
      ],
      usr_fac_harpreet_k: [
        {
          id: 'hist-hk-01',
          reqId: 'REQ-2026-073',
          assetCode: 'AST-0022',
          assetName: 'Portable PA Audio System',
          category: 'audio',
          quantity: 1,
          venue: 'Open Lawn Amphitheatre',
          date: '19 Oct 2026',
          timeSlot: '03:00 PM – 05:00 PM',
          returnCondition: 'Recharged & Intact',
          verifiedBy: 'Arpit Singh',
          subject: 'Debate Finals Presentation',
        },
      ],
      usr_fac_jahanvi: [
        {
          id: 'hist-jg-01',
          reqId: 'REQ-2026-069',
          assetCode: 'AST-0002-BLK',
          assetName: 'Whiteboard Marker (Black)',
          category: 'stationery',
          color: 'black',
          quantity: 2,
          venue: 'Aptitude Wing 104',
          date: '18 Oct 2026',
          timeSlot: '11:00 AM – 12:30 PM',
          returnCondition: 'Intact',
          verifiedBy: 'Malay Aggarwal',
          subject: 'Logical Reasoning Marathon',
        },
      ],
      usr_fac_adil: [
        {
          id: 'hist-ar-01',
          reqId: 'REQ-2026-081',
          assetCode: 'AST-0030',
          assetName: 'Logitech Rally HD Camera',
          category: 'recording',
          quantity: 1,
          venue: 'Boardroom Annex',
          date: '20 Oct 2026',
          timeSlot: '02:00 PM – 04:30 PM',
          returnCondition: 'Verified with Remote',
          verifiedBy: 'Malay Aggarwal',
          subject: 'Guest Webinar on Deep Learning',
        },
      ],
      usr_fac_simran: [
        {
          id: 'hist-sk-01',
          reqId: 'REQ-2026-086',
          assetCode: 'AST-0041',
          assetName: 'Digital Multimeter Set',
          category: 'it',
          quantity: 1,
          venue: 'VLSI Lab 02',
          date: '23 Oct 2026',
          timeSlot: '10:00 AM – 12:00 PM',
          returnCondition: 'Probes Intact',
          verifiedBy: 'Arpit Singh',
          subject: 'Circuit Analysis Practicals',
        },
      ],
      usr_fac_harsh: [
        {
          id: 'hist-hk2-01',
          reqId: 'REQ-2026-090',
          assetCode: 'AST-0002-BLU',
          assetName: 'Whiteboard Marker (Blue)',
          category: 'stationery',
          color: 'blue',
          quantity: 1,
          venue: 'Embedded Testing Bay',
          date: '24 Oct 2026',
          timeSlot: '03:00 PM – 04:30 PM',
          returnCondition: 'Intact',
          verifiedBy: 'Arpit Singh',
          subject: 'ARM Microcontroller Coding',
        },
      ],
      usr_fac_mohini: [
        {
          id: 'hist-mg-01',
          reqId: 'REQ-2026-062',
          assetCode: 'AST-0025',
          assetName: 'Wacom Cintiq Pro Stylus Kit',
          category: 'it',
          quantity: 1,
          venue: 'Design Studio 204',
          date: '17 Oct 2026',
          timeSlot: '10:30 AM – 01:00 PM',
          returnCondition: 'Nibs & Stand Intact',
          verifiedBy: 'Malay Aggarwal',
          subject: 'Digital Illustration Practical',
        },
      ],
      usr_fac_kavita: [
        {
          id: 'hist-kt-01',
          reqId: 'REQ-2026-118',
          assetCode: 'AST-0002-BLK',
          assetName: 'Whiteboard Marker (Black)',
          category: 'stationery',
          color: 'black',
          quantity: 2,
          venue: 'Counseling Room 304',
          date: 'Yesterday, 25 Oct 2026',
          timeSlot: '03:00 PM – 04:30 PM',
          returnCondition: 'Intact',
          verifiedBy: 'Malay Aggarwal',
          subject: 'Academic Counseling & Career Roadmaps',
        },
        {
          id: 'hist-kt-02',
          reqId: 'REQ-2026-099',
          assetCode: 'AST-0028',
          assetName: 'Logitech Wireless Presenter',
          category: 'it',
          quantity: 1,
          venue: 'Training Hall B-2',
          date: '23 Oct 2026',
          timeSlot: '11:00 AM – 12:30 PM',
          returnCondition: 'Verified Intact',
          verifiedBy: 'Arpit Singh',
          subject: 'Placement Preparation Workshop',
        },
      ],
      usr_fac_rhythm: [
        {
          id: 'hist-rd-01',
          reqId: 'REQ-2026-120',
          assetCode: 'AST-0002-BLU',
          assetName: 'Whiteboard Marker (Blue)',
          category: 'stationery',
          color: 'blue',
          quantity: 2,
          venue: 'Corporate Suite 102',
          date: 'Yesterday, 25 Oct 2026',
          timeSlot: '10:00 AM – 12:00 PM',
          returnCondition: 'Intact',
          verifiedBy: 'Arpit Singh',
          subject: 'Corporate Recruiter Strategy Summit',
        },
        {
          id: 'hist-rd-02',
          reqId: 'REQ-2026-105',
          assetCode: 'AST-0001',
          assetName: 'Epson PowerLite Laser Projector',
          category: 'it',
          quantity: 1,
          venue: 'Main Admin Conference Hall',
          date: '22 Oct 2026',
          timeSlot: '02:00 PM – 04:00 PM',
          returnCondition: 'Cleaned and Checked',
          verifiedBy: 'Malay Aggarwal',
          subject: 'Industry Engagement & Placement Alliances',
        },
      ],
    };
  }, []);

  // Compute live totals: exactly 12 teachers and exactly 40 units in use
  const stats = useMemo(() => {
    let black = 0;
    let blue = 0;
    let red = 0;
    let green = 0;
    let totalUnitsInCirculation = 0;

    facultyRoster.forEach((f) => {
      f.items.forEach((item) => {
        totalUnitsInCirculation += item.quantity;
        if (item.markerColor === 'black') black += item.quantity;
        else if (item.markerColor === 'blue') blue += item.quantity;
        else if (item.markerColor === 'red') red += item.quantity;
        else if (item.markerColor === 'green') green += item.quantity;
      });
    });

    const totalMarkers = black + blue + red + green;
    const otherAssets = totalUnitsInCirculation - totalMarkers;

    return {
      activeTeachers: facultyRoster.length,
      totalUnits: totalUnitsInCirculation,
      black,
      blue,
      red,
      green,
      totalMarkers,
      otherAssets,
    };
  }, [facultyRoster]);

  // Out of stock depleted items list
  const outOfStockItems = useMemo(() => {
    return [
      {
        code: 'AST-0002-BLK',
        name: 'Whiteboard Marker (Black - Chisel Tip)',
        category: 'Classroom Stationery',
        totalUnits: 13,
        inUseUnits: 13,
        availableUnits: 0,
        deployedTeachers: ['Harpreet Aulakh', 'Priyanka Dhiman', 'Surbhi Sharma', 'Archana Salaria', 'Bhawana Saini', 'Harpreet Kaur', 'Jahanvi Garg', 'Adil Raja', 'Simran Khera', 'Harsh Katariya', 'Ms. Kavita Thakur'],
        nextRelease: '11:00 AM (Interview Suite 101 - Harpreet Aulakh)',
      },
      {
        code: 'AST-0002-BLU',
        name: 'Whiteboard Marker (Royal Blue)',
        category: 'Classroom Stationery',
        totalUnits: 7,
        inUseUnits: 7,
        availableUnits: 0,
        deployedTeachers: ['Harpreet Aulakh', 'Gaganjit Kaur (x2)', 'Bhawana Saini', 'Jahanvi Garg', 'Simran Khera', 'Ms. Rhythm Dua'],
        nextRelease: '11:00 AM (Aptitude Lab 104 - Jahanvi Garg)',
      },
      {
        code: 'AST-0001',
        name: 'Epson PowerLite Laser Projector 5000L',
        category: 'Audio & Visual',
        totalUnits: 1,
        inUseUnits: 1,
        availableUnits: 0,
        deployedTeachers: ['Adil Raja (Auditorium Annex)'],
        nextRelease: '11:30 AM',
      },
      {
        code: 'AST-0004',
        name: 'Wireless Lapel Microphone Kit',
        category: 'Audio',
        totalUnits: 1,
        inUseUnits: 1,
        availableUnits: 0,
        deployedTeachers: ['Harpreet Kaur (Studio 1)'],
        nextRelease: '12:00 PM',
      },
    ];
  }, []);

  // Filtered faculty list
  const filteredFaculty = useMemo(() => {
    return facultyRoster.filter((faculty) => {
      const matchesSearch =
        !searchQuery.trim() ||
        faculty.facultyName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        faculty.department.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        faculty.currentVenue.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        faculty.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase().trim()));

      const matchesDept = selectedDeptFilter === 'all' || faculty.department === selectedDeptFilter;

      const matchesColor =
        selectedColorFilter === 'all' ||
        faculty.items.some((i) => i.markerColor === selectedColorFilter);

      return matchesSearch && matchesDept && matchesColor;
    });
  }, [facultyRoster, searchQuery, selectedDeptFilter, selectedColorFilter]);

  // Handle 'Notify Me' subscription submission
  const handleRegisterNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNotifyAsset || !subscriberEmail) return;

    const newSub: StockNotificationRequest = {
      id: `sub-${Date.now()}`,
      assetCode: selectedNotifyAsset.code,
      assetName: selectedNotifyAsset.name,
      requesterEmail: subscriberEmail,
      requesterName: subscriberName,
      requestedAt: 'Just Now',
      targetVenue: 'Campus Central Dispense',
      notified: false,
    };

    setActiveSubscribers((prev) => [newSub, ...prev]);
    setIsNotifyModalOpen(false);
    showToast(`Subscribed! An email notification will be triggered when ${selectedNotifyAsset.name} session ends.`, 'success');
  };

  // Simulate ending a faculty session and checking in their markers
  const handleReleaseFacultySession = (faculty: FacultyCustodyProfile) => {
    const releasedMarker = faculty.items.find((i) => i.markerColor);
    const releasedName = releasedMarker ? releasedMarker.name : 'Classroom Equipment';

    // Mark items returned in state
    setFacultyRoster((prev) => prev.filter((f) => f.facultyId !== faculty.facultyId));
    setSelectedTeacherModal(null);

    // Trigger automated email alert to all waiting subscribers for this asset
    const targetSubs = activeSubscribers.filter((s) => !s.notified);
    if (targetSubs.length > 0) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      targetSubs.forEach((sub) => {
        const logEntry = {
          id: `email-${Date.now()}-${Math.random()}`,
          to: sub.requesterEmail,
          subject: `[AssetHub Alert] ${releasedName} is Now Available for Pickup!`,
          time: now,
          details: `${faculty.facultyName}'s lecture in ${faculty.currentVenue} has finished. The item is now back in Central Dispense storage.`,
        };
        setEmailLogs((prev) => [logEntry, ...prev]);
      });

      // Mark subscribers as notified
      setActiveSubscribers((prev) =>
        prev.map((s) => ({ ...s, notified: true, notifiedAt: now }))
      );

      showToast(
        `Session ended! Automated pickup email dispatched to ${targetSubs[0].requesterName} (${targetSubs[0].requesterEmail}).`,
        'success'
      );
    } else {
      showToast(`Session ended! ${faculty.facultyName}'s items checked in successfully.`, 'info');
    }
  };

  return (
    <div className="flex flex-col w-full gap-5 text-[#0b1c30]">
      {/* Title & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs uppercase text-[#009299] font-bold">
              Institutional Asset Roster
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
            <span className="text-[11px] uppercase text-[#44474c] font-semibold">
              All {stats.activeTeachers} Faculty Members • {stats.totalUnits} Units in Active Custody
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30]">
            Faculty Custody &amp; Stationery Tracking Desk
          </h1>
          <p className="text-xs text-[#72777f] mt-0.5">
            Click on any teacher card to inspect their active classroom timings, marker color inventory, and complete past loan history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectNavTab('issue-and-return-desk')}
            className="h-9 px-3.5 bg-white hover:bg-[#eff4ff] text-[#426086] border border-[#cbdbf5] rounded-lg text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">keyboard_return</span>
            <span>Issue &amp; Return Desk</span>
          </button>
        </div>
      </div>

      {/* 4 Clickable Top KPI Summary Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Block 1: Faculty in Session */}
        <div
          onClick={() => setActiveKpiDetailModal('teachers')}
          className="p-4 bg-white rounded-xl shadow-xs border border-[#e5eeff] hover:border-[#009299] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          title={`Click to view all ${stats.activeTeachers} teachers roster`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase text-[#44474c] font-bold tracking-wider">
              Faculty in Session
            </span>
            <div className="flex items-center gap-1">
              <span className="p-1.5 rounded-lg bg-[#eff4ff] text-[#426086] flex items-center">
                <span className="material-symbols-outlined text-[18px]">co_present</span>
              </span>
              <span className="material-symbols-outlined text-[15px] text-[#72777f] group-hover:text-[#009299] group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#0b1c30]">{stats.activeTeachers} Teachers</span>
            <span className="text-[11px] text-[#44474c] block mt-0.5">
              100% of authorized faculty deployed in rooms
            </span>
          </div>
          <div className="mt-3 pt-2 bg-[#eff4ff]/60 rounded-lg px-2.5 py-1 flex items-center justify-between text-xs">
            <span className="text-[11px] text-[#426086]">Custody Status</span>
            <span className="font-mono text-xs text-[#009299] font-bold">{stats.activeTeachers} / {stats.activeTeachers} Verified</span>
          </div>
        </div>

        {/* Block 2: Units in Circulation */}
        <div
          onClick={() => setActiveKpiDetailModal('units')}
          className="p-4 bg-white rounded-xl shadow-xs border border-[#e5eeff] hover:border-[#009299] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          title={`Click to view full distribution of all ${stats.totalUnits} units in use`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase text-[#44474c] font-bold tracking-wider">
              Units in Circulation
            </span>
            <div className="flex items-center gap-1">
              <span className="p-1.5 rounded-lg bg-[#d3e4fe] text-[#3b5a7f] flex items-center">
                <span className="material-symbols-outlined text-[18px]">inventory</span>
              </span>
              <span className="material-symbols-outlined text-[15px] text-[#72777f] group-hover:text-[#009299] group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#0b1c30]">{stats.totalUnits} Units</span>
              <span className="text-xs text-[#009299] font-bold">In Use</span>
            </div>
            <span className="text-[11px] text-[#44474c] block mt-0.5">
              26 Markers + 14 Classroom Tech Aids
            </span>
          </div>
          <div className="mt-3 pt-2 bg-[#eff4ff]/60 rounded-lg px-2.5 py-1 flex items-center justify-between text-xs">
            <span className="text-[11px] text-[#426086]">Average per Teacher</span>
            <span className="font-mono text-xs text-[#0b1c30] font-bold">3.3 Units / Teacher</span>
          </div>
        </div>

        {/* Block 3: Markers by Color (26 Markers) */}
        <div
          onClick={() => setActiveKpiDetailModal('markers')}
          className="p-4 bg-white rounded-xl shadow-xs border border-[#e5eeff] hover:border-[#009299] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          title="Click to inspect marker color breakdown across rooms"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase text-[#44474c] font-bold tracking-wider">
              Markers by Color
            </span>
            <div className="flex items-center gap-1">
              <span className="p-1.5 rounded-lg bg-[#eff4ff] text-[#426086] flex items-center">
                <span className="material-symbols-outlined text-[18px]">draw</span>
              </span>
              <span className="material-symbols-outlined text-[15px] text-[#72777f] group-hover:text-[#009299] group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#0b1c30]">{stats.totalMarkers} Markers</span>
            <span className="text-[11px] text-[#44474c] block mt-0.5">
              Dry-erase chisel markers distributed
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-[#f1f5f9] flex items-center gap-1.5 text-[10px]">
            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono font-bold">
              {stats.black} Black
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white font-mono font-bold">
              {stats.blue} Blue
            </span>
            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono font-bold">
              {stats.red} Red
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-mono font-bold">
              {stats.green} Green
            </span>
          </div>
        </div>

        {/* Block 4: Zero Stock Items & Notify Engine */}
        <div
          onClick={() => setActiveKpiDetailModal('out-of-stock')}
          className="p-4 bg-white rounded-xl shadow-xs border border-[#e5eeff] hover:border-[#ba1a1a] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          title="Click to view out-of-stock items & automated alert queue"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase text-[#44474c] font-bold tracking-wider">
              0-Availability Items
            </span>
            <div className="flex items-center gap-1">
              <span className="p-1.5 rounded-lg bg-rose-50 text-[#ba1a1a] flex items-center">
                <span className="material-symbols-outlined text-[18px]">notification_important</span>
              </span>
              <span className="material-symbols-outlined text-[15px] text-[#ba1a1a] group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#ba1a1a]">{outOfStockItems.length} Depleted</span>
            <span className="text-[11px] text-[#44474c] block mt-0.5">
              All 12 Black markers in use across rooms
            </span>
          </div>
          <div className="mt-3 pt-2 bg-rose-50/60 rounded-lg px-2.5 py-1 flex items-center justify-between text-xs">
            <span className="text-[11px] text-[#ba1a1a] font-semibold">Auto-Notify Queue</span>
            <span className="font-mono text-xs text-[#ba1a1a] font-bold">
              {activeSubscribers.filter((s) => !s.notified).length} Waiting
            </span>
          </div>
        </div>
      </div>

      {/* Zero Availability Alert Banner (Simulated Out-of-Stock Scenario) */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 via-white to-[#eff4ff] border border-amber-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-900 mt-0.5 shrink-0">
            <span className="material-symbols-outlined text-[20px]">notification_important</span>
          </div>
          <div className="text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0b1c30] text-sm">
                Real-Time Stock Depletion: Whiteboard Markers (12/12 In Classroom Use)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-[#ba1a1a] font-bold text-[10px]">
                0 Available
              </span>
            </div>
            <p className="text-[#44474c] mt-0.5 leading-relaxed">
              All 12 Black markers are currently in use across 10 classrooms.
              Next handover session concludes at <strong>11:00 AM (Interview Suite 101 - Harpreet Aulakh)</strong>.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedNotifyAsset({
              _id: 'ast-0002-blk',
              code: 'AST-0002-BLK',
              name: 'Whiteboard Marker (Black - Chisel Tip)',
              category: 'stationery',
              categoryLabel: 'Classroom Stationery',
              classification: 'Consumable Writing Instrument',
              description: 'Standard black refillable whiteboard marker',
              totalQuantity: 12,
              availableQuantity: 0,
              dispatchedQuantity: 12,
              permanentQuantity: 0,
              minThreshold: 2,
              isConsumable: true,
              isReusable: true,
              unit: 'units',
              location: 'Central Dispense Shelf A2',
              status: 'depleted',
              barcodeTagStatus: 'verified',
            });
            setIsNotifyModalOpen(true);
          }}
          className="px-3.5 py-2 bg-[#009299] hover:bg-[#007a80] text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">add_alert</span>
          <span>Notify Me When Available</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 bg-white rounded-xl shadow-xs border border-[#e5eeff] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#72777f]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by teacher name, department, classroom venue, or asset code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#f8fafd] border border-[#cbdbf5] rounded-lg text-xs font-medium text-[#0b1c30] placeholder-[#72777f] focus:outline-none focus:ring-2 focus:ring-[#009299]/30 focus:border-[#009299]"
          />
        </div>

        {/* Color Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          <span className="text-[11px] text-[#72777f] font-bold uppercase shrink-0 mr-1">Markers:</span>
          <button
            type="button"
            onClick={() => setSelectedColorFilter('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
              selectedColorFilter === 'all'
                ? 'bg-[#0e1c2f] text-white shadow-2xs'
                : 'bg-[#eff4ff] text-[#426086] hover:bg-[#cbdbf5]'
            }`}
          >
            All (26)
          </button>
          <button
            type="button"
            onClick={() => setSelectedColorFilter('black')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
              selectedColorFilter === 'black'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-[#eff4ff] text-slate-800 hover:bg-[#cbdbf5]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-900 border border-white"></span>
            <span>Black ({stats.black})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedColorFilter('blue')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
              selectedColorFilter === 'blue'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-[#eff4ff] text-blue-700 hover:bg-[#cbdbf5]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>Blue ({stats.blue})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedColorFilter('red')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
              selectedColorFilter === 'red'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-[#eff4ff] text-rose-700 hover:bg-[#cbdbf5]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
            <span>Red ({stats.red})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedColorFilter('green')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
              selectedColorFilter === 'green'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-[#eff4ff] text-emerald-700 hover:bg-[#cbdbf5]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span>Green ({stats.green})</span>
          </button>
        </div>

        {/* View Switcher: List view is default */}
        <div className="flex items-center bg-[#eff4ff] p-1 rounded-lg border border-[#cbdbf5] shrink-0 ml-auto md:ml-2">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white shadow-sm text-[#0e1c2f] font-bold'
                : 'text-[#44474c] hover:text-[#0b1c30]'
            }`}
            title="List View (Default)"
          >
            <span className="material-symbols-outlined text-[18px]">table_rows</span>
            <span className="text-[11px] font-semibold">List View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-2 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white shadow-sm text-[#0e1c2f] font-bold'
                : 'text-[#44474c] hover:text-[#0b1c30]'
            }`}
            title="Box / Grid View"
          >
            <span className="material-symbols-outlined text-[18px]">grid_view</span>
            <span className="text-[11px] font-semibold">Box View</span>
          </button>
        </div>
      </div>

      {/* View Mode: List View (Default) */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-xl shadow-xs border border-[#cbdbf5] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#eff4ff] text-[#44474c] text-[11px] uppercase tracking-wider h-11 border-b border-[#cbdbf5]">
                  <th className="px-4 py-2 font-bold">Faculty Member</th>
                  <th className="px-4 py-2 font-bold">Current Venue &amp; Session</th>
                  <th className="px-4 py-2 font-bold">Markers in Custody</th>
                  <th className="px-4 py-2 font-bold">Hardware &amp; Equipment</th>
                  <th className="px-4 py-2 font-bold text-center">Units in Use</th>
                  <th className="px-4 py-2 font-bold">Status</th>
                  <th className="px-4 py-2 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5eeff]">
                {filteredFaculty.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#72777f]">
                      No faculty members found matching your search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredFaculty.map((faculty) => {
                    const totalUnitsInCustody = faculty.items.reduce((sum, item) => sum + item.quantity, 0);
                    const markers = faculty.items.filter((i) => i.markerColor);
                    const nonMarkers = faculty.items.filter((i) => !i.markerColor);

                    return (
                      <tr
                        key={faculty.facultyId}
                        onClick={() => {
                          setSelectedTeacherModal(faculty);
                          setActiveModalTab('current');
                        }}
                        className="hover:bg-[#f8fafd] transition-colors cursor-pointer group"
                        title="Click to view complete asset breakdown & history"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={faculty.avatar}
                              alt={faculty.facultyName}
                              className="w-10 h-10 rounded-full border border-[#cbdbf5] object-cover shrink-0 group-hover:scale-105 transition-transform"
                            />
                            <div>
                              <div className="font-bold text-[#0b1c30] text-sm group-hover:text-[#009299] transition-colors">
                                {faculty.facultyName}
                              </div>
                              <div className="text-[11px] text-[#426086] font-medium">
                                {faculty.department}
                              </div>
                              <div className="text-[10px] text-[#72777f] font-mono">
                                {faculty.cabin}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 max-w-[260px]">
                          <div className="flex items-center gap-1.5 text-[#0b1c30] font-semibold">
                            <span className="material-symbols-outlined text-[15px] text-[#009299]">location_on</span>
                            <span className="truncate">{faculty.currentVenue}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[#44474c] text-[11px] mt-0.5">
                            <span className="material-symbols-outlined text-[14px] text-[#72777f]">schedule</span>
                            <span className="truncate">{faculty.currentSession}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {markers.length > 0 ? (
                              markers.map((m) => {
                                const colorClass =
                                  m.markerColor === 'black'
                                    ? 'bg-slate-900 text-white'
                                    : m.markerColor === 'blue'
                                    ? 'bg-blue-600 text-white'
                                    : m.markerColor === 'red'
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-emerald-600 text-white';

                                return (
                                  <span
                                    key={m.id}
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 shadow-2xs ${colorClass}`}
                                  >
                                    <span className="capitalize">{m.markerColor}</span>
                                    <span className="opacity-90 font-mono">×{m.quantity}</span>
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[#72777f] text-[11px] italic">No markers</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {nonMarkers.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {nonMarkers.map((nm) => (
                                <span
                                  key={nm.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#eff4ff] text-[#0e1c2f] border border-[#cbdbf5] text-[11px] font-medium truncate max-w-[220px]"
                                  title={nm.name}
                                >
                                  <span className="material-symbols-outlined text-[13px] text-[#009299]">
                                    {nm.category === 'it' ? 'devices' : 'inventory_2'}
                                  </span>
                                  <span className="truncate">{nm.name}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[#72777f] text-[11px] italic">No extra hardware</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="px-2.5 py-1 rounded-full font-mono font-bold text-xs bg-[#f0f4f9] text-[#0b1c30] border border-[#cbdbf5]">
                            {totalUnitsInCustody} {totalUnitsInCustody === 1 ? 'unit' : 'units'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                            <span>Teaching Now</span>
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTeacherModal(faculty);
                                setActiveModalTab('current');
                              }}
                              className="px-2.5 py-1 bg-[#0e1c2f] hover:bg-[#426086] text-white rounded text-xs font-semibold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>Details</span>
                              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReleaseFacultySession(faculty);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-[#44474c] hover:text-[#ba1a1a] hover:bg-rose-50 rounded transition-colors cursor-pointer border border-[#cbdbf5]"
                              title="Conclude active lecture and return items to storage"
                            >
                              End
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Box / Grid View fallback */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFaculty.map((faculty) => {
          const totalUnitsInCustody = faculty.items.reduce((sum, item) => sum + item.quantity, 0);
          const historyCount = facultyHistoryDB[faculty.facultyId]?.length || 0;

          return (
            <div
              key={faculty.facultyId}
              onClick={() => {
                setSelectedTeacherModal(faculty);
                setActiveModalTab('current');
              }}
              className="p-4 bg-white rounded-xl shadow-xs border border-[#cbdbf5] hover:border-[#009299] hover:shadow-md transition-all flex flex-col justify-between gap-3 text-xs group cursor-pointer"
              title="Click to view full asset details and past loan history"
            >
              <div>
                {/* Teacher Profile Header */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={faculty.avatar}
                      alt={faculty.facultyName}
                      className="w-11 h-11 rounded-full border border-[#cbdbf5] object-cover shrink-0 group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <h3 className="font-bold text-[#0b1c30] text-sm group-hover:text-[#009299] transition-colors">
                        {faculty.facultyName}
                      </h3>
                      <span className="text-[11px] text-[#426086] font-medium block">
                        {faculty.department}
                      </span>
                      <span className="text-[10px] text-[#72777f] font-mono block">
                        {faculty.cabin}
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    Teaching Now
                  </span>
                </div>

                {/* Classroom Venue & Timing Window */}
                <div className="mt-3 p-2.5 rounded-lg bg-[#f8fafd] border border-[#e5eeff] space-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-[#0b1c30] font-semibold">
                    <span className="material-symbols-outlined text-[15px] text-[#009299]">location_on</span>
                    <span className="truncate">{faculty.currentVenue}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#44474c]">
                    <span className="material-symbols-outlined text-[15px] text-[#426086]">schedule</span>
                    <span>{faculty.currentSession}</span>
                  </div>
                </div>

                {/* Distributed Items & Marker Colors */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-[#72777f] tracking-wider">
                      Distributed Assets ({totalUnitsInCustody} Units):
                    </span>
                    <span className="text-[10px] text-[#009299] font-bold">
                      {historyCount} Past Loans
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {faculty.items.map((item) => {
                      if (item.markerColor === 'black') {
                        return (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-white font-medium text-[11px] shadow-2xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            <span>Black Marker x{item.quantity}</span>
                          </span>
                        );
                      }
                      if (item.markerColor === 'blue') {
                        return (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600 text-white font-medium text-[11px] shadow-2xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            <span>Blue Marker x{item.quantity}</span>
                          </span>
                        );
                      }
                      if (item.markerColor === 'red') {
                        return (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 text-white font-medium text-[11px] shadow-2xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            <span>Red Marker x{item.quantity}</span>
                          </span>
                        );
                      }
                      if (item.markerColor === 'green') {
                        return (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white font-medium text-[11px] shadow-2xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            <span>Green Marker x{item.quantity}</span>
                          </span>
                        );
                      }
                      return (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#eff4ff] text-[#426086] border border-[#cbdbf5] font-medium text-[11px]"
                        >
                          <span className="material-symbols-outlined text-[12px]">devices</span>
                          <span>{item.name}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-2.5 border-t border-[#f1f5f9] flex items-center justify-between">
                <span className="text-xs font-bold text-[#009299] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>View Details &amp; History</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReleaseFacultySession(faculty);
                  }}
                  className="px-2 py-1 text-[11px] font-semibold text-[#44474c] hover:text-[#ba1a1a] hover:bg-rose-50 rounded transition-colors cursor-pointer"
                  title="Conclude active lecture and return items to storage"
                >
                  Conclude Session
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}

      {/* Dispatched Notification History Logs Table */}
      {emailLogs.length > 0 && (
        <div className="p-5 bg-white rounded-xl shadow-xs border border-emerald-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[20px] text-emerald-600">mark_email_read</span>
            <h2 className="text-sm font-bold text-[#0b1c30]">
              Automated Email Notification Audit Log (Dispatched Upon Session Handover)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-emerald-50/70 text-emerald-900 font-bold uppercase text-[10px] border-b border-emerald-200">
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">Recipient Email</th>
                  <th className="py-2 px-3">Email Subject</th>
                  <th className="py-2 px-3">Session Handover Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {emailLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#f8fafd]">
                    <td className="py-2 px-3 font-mono text-[11px] text-[#72777f]">{log.time}</td>
                    <td className="py-2 px-3 font-bold text-[#0b1c30]">{log.to}</td>
                    <td className="py-2 px-3 font-semibold text-emerald-700">{log.subject}</td>
                    <td className="py-2 px-3 text-[#44474c]">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TEACHER LIVE CUSTODY & COMPLETE HISTORY POPUP MODAL */}
      {/* ========================================================================= */}
      {selectedTeacherModal && (
        <div
          className="fixed inset-0 z-50 bg-[#0e1c2f]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setSelectedTeacherModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#e5eeff] flex items-center justify-between bg-gradient-to-r from-[#f8fafd] to-white">
              <div className="flex items-center gap-3">
                <img
                  src={selectedTeacherModal.avatar}
                  alt={selectedTeacherModal.facultyName}
                  className="w-12 h-12 rounded-full border border-[#cbdbf5] object-cover"
                />
                <div>
                  <h2 className="text-base font-bold text-[#0b1c30]">
                    {selectedTeacherModal.facultyName} • Faculty Asset Dossier
                  </h2>
                  <p className="text-xs text-[#72777f]">
                    {selectedTeacherModal.department} • {selectedTeacherModal.cabin} • {selectedTeacherModal.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTeacherModal(null)}
                className="w-8 h-8 rounded-lg text-[#72777f] hover:text-[#0b1c30] hover:bg-[#eff4ff] flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Tabs: Active Custody vs Complete Past History */}
            <div className="px-6 py-2.5 bg-[#eff4ff]/60 border-b border-[#e5eeff] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('current')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeModalTab === 'current'
                      ? 'bg-white text-[#0b1c30] shadow-2xs'
                      : 'text-[#426086] hover:bg-white/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">sensors</span>
                  <span>Active Custody &amp; Timing</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('history')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeModalTab === 'history'
                      ? 'bg-white text-[#0b1c30] shadow-2xs'
                      : 'text-[#426086] hover:bg-white/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">history</span>
                  <span>
                    Complete Loan History ({facultyHistoryDB[selectedTeacherModal.facultyId]?.length || 0})
                  </span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-[#009299] font-bold">
                Status: In Session
              </span>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {activeModalTab === 'current' && (
                <>
                  {/* Classroom Location & Session Telemetry */}
                  <div className="p-3.5 rounded-xl bg-[#eff4ff] border border-[#cbdbf5] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#426086] block">
                        Assigned Classroom &amp; Lecture:
                      </span>
                      <span className="font-bold text-sm text-[#0b1c30] block mt-0.5">
                        {selectedTeacherModal.currentVenue}
                      </span>
                      <span className="text-[11px] text-[#44474c] mt-0.5 block">
                        Timetable: {selectedTeacherModal.currentSession}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        Active Lecture
                      </span>
                    </div>
                  </div>

                  {/* Itemized Distributed Assets Table */}
                  <div>
                    <h3 className="font-bold text-xs uppercase text-[#426086] tracking-wider mb-2">
                      Currently Distributed Assets ({selectedTeacherModal.items.reduce((s, i) => s + i.quantity, 0)} Units):
                    </h3>
                    <div className="border border-[#cbdbf5] rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-[#f8fafd] text-[#426086] font-bold text-[10px] uppercase border-b border-[#cbdbf5]">
                            <th className="py-2 px-3">Item Description</th>
                            <th className="py-2 px-3">Marker Color / Type</th>
                            <th className="py-2 px-3 text-center">Qty</th>
                            <th className="py-2 px-3">Timing Window</th>
                            <th className="py-2 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1f5f9]">
                          {selectedTeacherModal.items.map((item) => (
                            <tr key={item.id} className="hover:bg-[#f8fafd]">
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-[#0b1c30] block">{item.name}</span>
                                <span className="font-mono text-[10px] text-[#72777f]">{item.assetCode}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                {item.markerColor ? (
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      item.markerColor === 'black'
                                        ? 'bg-slate-900 text-white'
                                        : item.markerColor === 'blue'
                                        ? 'bg-blue-600 text-white'
                                        : item.markerColor === 'red'
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-emerald-600 text-white'
                                    }`}
                                  >
                                    {item.markerColor}
                                  </span>
                                ) : (
                                  <span className="text-[#426086] font-medium capitalize">{item.category}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-[#0b1c30]">
                                {item.quantity}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-[#44474c]">
                                {item.sessionStartTime} – {item.sessionEndTime}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  In Custody
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Handover & Session End Action */}
                  <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="font-bold text-amber-950 block">Conclude Lecture &amp; Check In</span>
                      <span className="text-[11px] text-amber-900 mt-0.5 block">
                        Record item return to Central Dispense and trigger automated alerts to waiting faculty.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleReleaseFacultySession(selectedTeacherModal)}
                      className="px-3.5 py-1.5 bg-[#0e1c2f] hover:bg-[#ba1a1a] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Conclude &amp; Alert
                    </button>
                  </div>
                </>
              )}

              {/* TAB 2: Complete Past History */}
              {activeModalTab === 'history' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="font-bold text-xs uppercase text-[#426086]">
                      Historical Custody Ledger &amp; Return Receipts:
                    </span>
                    <span className="text-[11px] text-[#72777f]">Audited by Admin Malay Aggarwal &amp; Arpit Singh</span>
                  </div>

                  {(!facultyHistoryDB[selectedTeacherModal.facultyId] ||
                    facultyHistoryDB[selectedTeacherModal.facultyId].length === 0) ? (
                    <div className="py-10 text-center text-gray-500">
                      <span className="material-symbols-outlined text-[32px] text-gray-300 block mb-1">
                        history_toggle_off
                      </span>
                      <span>No archived history entries for this faculty member yet.</span>
                    </div>
                  ) : (
                    <div className="border border-[#cbdbf5] rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-[#f8fafd] text-[#426086] font-bold text-[10px] uppercase border-b border-[#cbdbf5]">
                            <th className="py-2 px-3">Req ID / Date</th>
                            <th className="py-2 px-3">Asset &amp; Color</th>
                            <th className="py-2 px-3">Lecture Subject / Venue</th>
                            <th className="py-2 px-3 text-center">Qty</th>
                            <th className="py-2 px-3">Return Audit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1f5f9]">
                          {facultyHistoryDB[selectedTeacherModal.facultyId].map((hist) => (
                            <tr key={hist.id} className="hover:bg-[#f8fafd]">
                              <td className="py-2.5 px-3">
                                <span className="font-mono font-bold text-[#0b1c30] block">{hist.reqId}</span>
                                <span className="text-[10px] text-[#72777f]">{hist.date}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-[#0b1c30] block">{hist.assetName}</span>
                                <span className="font-mono text-[10px] text-[#72777f]">{hist.assetCode}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-[#0b1c30] block">{hist.subject}</span>
                                <span className="text-[10px] text-[#44474c]">{hist.venue} ({hist.timeSlot})</span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-[#0b1c30]">
                                {hist.quantity}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-emerald-700 font-bold block">{hist.returnCondition}</span>
                                <span className="text-[10px] text-[#72777f]">Verified by: {hist.verifiedBy}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-[#e5eeff] bg-[#f8fafd] flex items-center justify-between">
              <span className="text-xs text-[#72777f]">
                Complete Faculty Audit Roster • Sunstone AssetHub
              </span>
              <button
                type="button"
                onClick={() => setSelectedTeacherModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#cbdbf5] text-[#0e1c2f] text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TOP KPI CARD DRILL-DOWN MODALS (Everything Clickable) */}
      {/* ========================================================================= */}
      {activeKpiDetailModal && (
        <div
          className="fixed inset-0 z-50 bg-[#0e1c2f]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setActiveKpiDetailModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#e5eeff] flex items-center justify-between bg-gradient-to-r from-[#f8fafd] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#009299]/10 text-[#009299] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">
                    {activeKpiDetailModal === 'teachers' && 'co_present'}
                    {activeKpiDetailModal === 'units' && 'inventory'}
                    {activeKpiDetailModal === 'markers' && 'draw'}
                    {activeKpiDetailModal === 'out-of-stock' && 'notification_important'}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0b1c30]">
                    {activeKpiDetailModal === 'teachers' && `All ${facultyRoster.length} Academic Faculty Members (Live Deployments)`}
                    {activeKpiDetailModal === 'units' && `Detailed Distribution of all ${stats.totalUnits} Units in Circulation`}
                    {activeKpiDetailModal === 'markers' && 'Marker Color Allocation by Classroom & Teacher'}
                    {activeKpiDetailModal === 'out-of-stock' && '0-Availability Depleted Items & Automated Queue'}
                  </h2>
                  <p className="text-xs text-[#72777f]">
                    Institutional real-time inventory ledger and classroom telemetry.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveKpiDetailModal(null)}
                className="w-8 h-8 rounded-lg text-[#72777f] hover:text-[#0b1c30] hover:bg-[#eff4ff] flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Detailed Table for all 40 Units */}
              <div className="border border-[#cbdbf5] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#eff4ff] text-[#426086] font-bold uppercase text-[10px] border-b border-[#cbdbf5]">
                      <th className="py-2.5 px-3">Faculty Custodian</th>
                      <th className="py-2.5 px-3">Classroom Venue</th>
                      <th className="py-2.5 px-3">Session Timing</th>
                      <th className="py-2.5 px-3">Items in Custody</th>
                      <th className="py-2.5 px-3 text-center">Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {facultyRoster.map((fac) => (
                      <tr
                        key={fac.facultyId}
                        onClick={() => {
                          setActiveKpiDetailModal(null);
                          setSelectedTeacherModal(fac);
                        }}
                        className="hover:bg-[#f8fafd] cursor-pointer"
                      >
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-[#0b1c30] block">{fac.facultyName}</span>
                          <span className="text-[10px] text-[#72777f]">{fac.department}</span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#009299]">{fac.currentVenue}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#44474c]">{fac.currentSession.split('•')[0]}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {fac.items.map((i) => (
                              <span
                                key={i.id}
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  i.markerColor === 'black'
                                    ? 'bg-slate-900 text-white'
                                    : i.markerColor === 'blue'
                                    ? 'bg-blue-600 text-white'
                                    : i.markerColor === 'red'
                                    ? 'bg-rose-600 text-white'
                                    : i.markerColor === 'green'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[#eff4ff] text-[#426086]'
                                }`}
                              >
                                {i.name} x{i.quantity}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-[#0b1c30]">
                          {fac.items.reduce((s, i) => s + i.quantity, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-[#e5eeff] bg-[#f8fafd] flex items-center justify-between">
              <span className="text-xs text-[#72777f]">
                Total: 12 Faculty Members • 40 Units in Circulation
              </span>
              <button
                type="button"
                onClick={() => setActiveKpiDetailModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ZERO-STOCK 'NOTIFY ME WHEN AVAILABLE' MODAL */}
      {/* ========================================================================= */}
      {isNotifyModalOpen && selectedNotifyAsset && (
        <div
          className="fixed inset-0 z-50 bg-[#0e1c2f]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setIsNotifyModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] max-w-lg w-full flex flex-col overflow-hidden text-left animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#e5eeff] flex items-center justify-between bg-gradient-to-r from-amber-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">add_alert</span>
                </div>
                <div>
                  <h3 className="font-bold text-[#0b1c30] text-sm">
                    Stock Depletion: Notify Me When Available
                  </h3>
                  <span className="text-[11px] text-[#72777f]">
                    Zero units currently available in storage
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsNotifyModalOpen(false)}
                className="w-7 h-7 rounded-lg text-[#72777f] hover:text-[#0b1c30] hover:bg-[#eff4ff] flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRegisterNotification} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950">
                <div className="font-bold text-xs">{selectedNotifyAsset.name}</div>
                <div className="text-[11px] mt-0.5">
                  All units are currently deployed across classrooms. The nearest lecture session concludes at <strong>11:00 AM (Interview Suite 101 - Harpreet Aulakh)</strong>.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0b1c30] mb-1">
                  Recipient Teacher Name:
                </label>
                <input
                  type="text"
                  required
                  value={subscriberName}
                  onChange={(e) => setSubscriberName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8fafd] border border-[#cbdbf5] rounded-lg text-xs font-medium text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#009299]/30 focus:border-[#009299]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0b1c30] mb-1">
                  Alert Email Address (Will receive pickup alert):
                </label>
                <input
                  type="email"
                  required
                  value={subscriberEmail}
                  onChange={(e) => setSubscriberEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8fafd] border border-[#cbdbf5] rounded-lg text-xs font-medium text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#009299]/30 focus:border-[#009299]"
                />
                <span className="text-[10px] text-[#72777f] mt-1 block">
                  As soon as any faculty member checks in their markers or session ends, an automated alert will be sent.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNotifyModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#72777f] hover:bg-[#eff4ff] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#009299] hover:bg-[#007a80] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>
                  <span>Confirm Email Alert Subscription</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
