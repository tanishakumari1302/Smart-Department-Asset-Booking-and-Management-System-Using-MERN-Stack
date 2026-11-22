import React, { useState } from 'react';
import { AuditLog } from '../types';

interface AuditLogViewProps {
  auditLogs: AuditLog[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ auditLogs }) => {
  const [selectedCat, setSelectedCat] = useState<string>('all');

  const filtered = auditLogs.filter((l) => {
    return selectedCat === 'all' || l.category === selectedCat;
  });

  return (
    <div className="flex flex-col w-full gap-5 text-[#0b1c30]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs uppercase text-[#009299] font-bold">
              Compliance &amp; Security
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
            <span className="text-[11px] uppercase text-[#44474c] font-semibold">
              Tamper-Evident Ledger
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30]">
            System Operations &amp; Audit Log
          </h1>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="h-9 px-3 rounded-lg bg-white border border-[#cbdbf5] text-xs font-semibold text-[#0b1c30] shadow-sm"
          >
            <option value="all">All Event Categories</option>
            <option value="booking">Requisition &amp; Bookings</option>
            <option value="inventory">Inventory Adjustments</option>
            <option value="return">Hardware Check-In / Returns</option>
            <option value="auth">Authentication &amp; Access</option>
            <option value="system">System Notifications</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#eff4ff] text-[#44474c] text-[11px] uppercase tracking-wider h-10">
                <th className="px-4 py-2 font-semibold rounded-l-lg">Timestamp</th>
                <th className="px-4 py-2 font-semibold">Action Type</th>
                <th className="px-4 py-2 font-semibold">Actor / Role</th>
                <th className="px-4 py-2 font-semibold">Target Code</th>
                <th className="px-4 py-2 font-semibold">Audit Event Description</th>
                <th className="px-4 py-2 font-semibold text-right rounded-r-lg">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5eeff]">
              {filtered.map((log, idx) => (
                <tr key={log.id || log._id || `audit-row-${log.timestamp || idx}-${idx}`} className="hover:bg-[#eff4ff]/40">
                  <td className="px-4 py-3 font-mono text-[11px] text-[#44474c]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#0b1c30]">{log.action}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{log.actorName}</span>
                    <span className="text-[10px] text-[#44474c] block">{log.actorRole}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] font-bold text-[#426086]">
                    {log.targetCode || '—'}
                  </td>
                  <td className="px-4 py-3 text-[#44474c]">{log.description}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        log.status === 'alert'
                          ? 'bg-[#ffdad6] text-[#ba1a1a]'
                          : log.status === 'warning'
                          ? 'bg-[#d3e4fe] text-[#0b1c30]'
                          : 'bg-[#dce9ff] text-[#009299]'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
