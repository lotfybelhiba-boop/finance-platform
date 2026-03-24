import React from 'react';
import { FileText, BookOpen, PieChart } from 'lucide-react';

const MonthlySummaryCard = () => {
    return (
        <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={14} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', lineHeight: '1' }}>14</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Factures</div>
            </div>

            <div style={{ width: '1px', height: '32px', background: 'var(--border-color)' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={14} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', lineHeight: '1' }}>2</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Compta</div>
            </div>

            <div style={{ width: '1px', height: '32px', background: 'var(--border-color)' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px' }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PieChart size={14} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', lineHeight: '1' }}>4</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Rapports</div>
            </div>
        </div>
    );
};

export default MonthlySummaryCard;
