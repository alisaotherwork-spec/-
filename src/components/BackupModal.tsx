import React, { useState } from 'react';
import { EXTERNAL_LINKS } from '../data/initialData';
import {
  createFullBackupPayload,
  restoreFromBackupPayload,
  pushAllToFirestore,
  pullAllFromFirestore,
  initializeFirestoreSync,
} from '../utils/storage';
import { RoomType } from '../types';
import {
  Database,
  Download,
  Upload,
  ExternalLink,
  Check,
  Copy,
  HardDrive,
  RefreshCw,
  CloudUpload,
  CloudDownload,
  Sparkles,
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => void;
  year: number;
  month: number;
  room: RoomType | 'all';
  shiftsMap: Record<string, string>;
  roomAssignments: Record<string, RoomType>;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
  year,
  month,
  room,
  shiftsMap,
  roomAssignments,
}) => {
  const [copied, setCopied] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    const payload = createFullBackupPayload();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Duty_Schedule_TM_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPayload = () => {
    const payload = createFullBackupPayload();
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = restoreFromBackupPayload(content);
      if (success) {
        setSyncStatus('กู้คืนข้อมูลจากไฟล์สำเร็จเรียบร้อยแล้ว!');
        onDataRestored();
        setTimeout(() => setSyncStatus(null), 3000);
      } else {
        setSyncStatus('ไฟล์สำรองไม่ถูกต้อง ไม่สามารถกู้คืนได้');
      }
    };
    reader.readAsText(file);
  };

  const handlePushFirestore = async () => {
    setIsSyncing(true);
    setSyncStatus('กำลังบันทึกข้อมูลไปยัง Firebase Firestore...');
    const ok = await pushAllToFirestore(year, month, room, shiftsMap, roomAssignments);
    setIsSyncing(false);
    if (ok) {
      setSyncStatus('บันทึกข้อมูลทั้งหมดขึ้น Firebase Firestore (duty-schedule-tm) สำเร็จเรียบร้อย!');
    } else {
      setSyncStatus('เกิดข้อผิดพลาดในการบันทึกขึ้น Firestore');
    }
    setTimeout(() => setSyncStatus(null), 4000);
  };

  const handlePullFirestore = async () => {
    setIsSyncing(true);
    setSyncStatus('กำลังดึงข้อมูลจาก Firebase Firestore...');
    const res = await pullAllFromFirestore(year, month, room);
    setIsSyncing(false);
    if (res.staff || res.schedule) {
      setSyncStatus('ดึงข้อมูลจาก Firestore สำเร็จและอัปเดตข้อมูลบนหน้าจอแล้ว!');
      onDataRestored();
    } else {
      setSyncStatus('ไม่พบข้อมูลตารางเวรใน Firestore สำหรับเดือนนี้ หรือเกิดข้อผิดพลาด');
    }
    setTimeout(() => setSyncStatus(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="paper-card w-full max-w-xl my-6 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-[#8B1E27] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#A82B35] rounded-lg">
              <Database className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg">Firebase Firestore & Cloud Backup</h3>
              <p className="text-xs text-amber-100/80">
                โครงการ Firebase: duty-schedule-tm
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs text-stone-700">
          {/* Live Firebase Status Card */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-emerald-950 text-sm">
                  Firebase Firestore เชื่อมต่อแล้ว (Connected)
                </span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 font-bold rounded-md text-[10px]">
                Active
              </span>
            </div>

            <div className="text-[11px] text-stone-600 space-y-1 mb-3">
              <div>
                <strong>Firebase Project:</strong> <code className="bg-white/80 px-1 py-0.5 rounded text-emerald-800">duty-schedule-tm</code>
              </div>
              <div>
                <strong>คอลเลกชันในระบบ:</strong> <code className="bg-white/80 px-1 py-0.5 rounded text-stone-700">staff</code>, <code className="bg-white/80 px-1 py-0.5 rounded text-stone-700">schedules</code>, <code className="bg-white/80 px-1 py-0.5 rounded text-stone-700">shiftDefinitions</code>
              </div>
              <div>
                <strong>สถานะการทำงาน:</strong> ซิงค์ข้อมูลลง Firestore อัตโนมัติทุกครั้งที่มีการแก้ไขตารางเวร
              </div>
            </div>

            {/* Direct Sync Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/80">
              <button
                type="button"
                onClick={handlePushFirestore}
                disabled={isSyncing}
                className="py-2 px-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <CloudUpload className="w-4 h-4 text-emerald-200" />
                บันทึกขึ้น Firestore ทันที
              </button>

              <button
                type="button"
                onClick={handlePullFirestore}
                disabled={isSyncing}
                className="py-2 px-3 bg-white hover:bg-emerald-50 border border-emerald-400 disabled:opacity-50 text-emerald-900 font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <CloudDownload className="w-4 h-4 text-emerald-700" />
                ดึงข้อมูลจาก Firestore
              </button>
            </div>
          </div>

          {syncStatus && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold animate-in fade-in flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{syncStatus}</span>
            </div>
          )}

          {/* External Links */}
          <div className="space-y-2">
            <div className="font-bold text-stone-900 text-sm">โฟลเดอร์และสเปรดชีตสำรอง:</div>
            
            <a
              href={EXTERNAL_LINKS.googleDrive}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 text-amber-800" />
                <div>
                  <span className="font-semibold text-stone-900 block">Google Drive: โฟลเดอร์ "ตารางเวร"</span>
                  <span className="text-[11px] text-stone-500">สำหรับจัดเก็บไฟล์ PDF ตารางเวร และใบเบิก OT ประจำเดือน</span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-stone-400" />
            </a>

            <a
              href={EXTERNAL_LINKS.googleSheets}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-emerald-800" />
                <div>
                  <span className="font-semibold text-stone-900 block">Google Sheets: สเปรดชีตตารางเวร</span>
                  <span className="text-[11px] text-stone-500">สำหรับตรวจสอบและสรุปเวรภาพรวม</span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-stone-400" />
            </a>
          </div>

          {/* Backup & Restore Controls */}
          <div className="pt-3 border-t border-stone-200 space-y-3">
            <div className="font-bold text-stone-900 text-sm">การดาวน์โหลดและนำเข้าไฟล์สำรอง:</div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="p-2.5 bg-[#8B1E27] hover:bg-[#721820] text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลดไฟล์สำรอง (.json)
              </button>

              <button
                type="button"
                onClick={handleCopyPayload}
                className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'คัดลอกข้อมูลแล้ว' : 'คัดลอก JSON ทั้งหมด'}
              </button>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
              <label className="block font-medium text-stone-700 mb-1">
                กู้คืนข้อมูลจากไฟล์สำรอง (.json):
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="text-xs text-stone-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#8B1E27] file:text-white hover:file:bg-[#721820] cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#F7F2EA] p-3 sm:p-4 border-t border-[#E5D5C5] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-stone-700 hover:bg-stone-200 rounded-lg"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
