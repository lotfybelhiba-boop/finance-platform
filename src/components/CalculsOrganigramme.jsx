import React from 'react';
import { ArrowRight, Database, FileText, CreditCard, Landmark, CheckCircle, AlertTriangle, Calculator, Briefcase, TrendingUp, RefreshCw, Layers } from 'lucide-react';

const FlowArrow = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
        <ArrowRight size={24} color="var(--text-muted)" />
    </div>
);

const ModuleCard = ({ title, content, color }) => (
    <div style={{ background: 'var(--bg-main)', border: `2px solid ${color}`, borderRadius: '12px', padding: '16px', flex: '1 1 200px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: `1px solid ${color}40`, paddingBottom: '8px' }}>
            <div style={{ background: `${color}20`, padding: '6px', borderRadius: '8px' }}></div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{title}</h4>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            {content}
        </div>
    </div>
);

const SectionBlock = ({ title, children }) => (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '2px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
            <div style={{ background: 'var(--primary-color)', color: 'white', padding: '8px', borderRadius: '10px' }}>
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>{title}</h3>
        </div>
        {children}
    </div>
);

const MetaProperty = ({ label, value, type }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
        <div style={{ fontWeight: '700', fontSize: '12px', color: 'var(--text-main)', minWidth: '120px' }}>{label} :</div>
        <div style={{ fontSize: '12px', color: type === 'formula' ? '#8b5cf6' : 'var(--text-muted)', fontFamily: type === 'formula' ? 'monospace' : 'inherit', background: type === 'formula' ? '#f3f4f6' : 'transparent', padding: type === 'formula' ? '2px 6px' : '0', borderRadius: '4px' }}>{value}</div>
    </div>
);

const CalculsOrganigramme = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.4s ease-out' }}>
            {/* VUE GLOBALE */}
            <SectionBlock title="Vue Globale Macro : Flux des Données" icon={Layers}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <ModuleCard 
                        icon={Briefcase} color="#3b82f6" title="1. Base Client & Projet" 
                        content={<ul style={{ margin: 0, paddingLeft: '16px' }}>
                            <li>Création du profil client</li>
                            <li>Saisie de la durée du contrat</li>
                            <li>Estimation des coûts fixes (RH, Outils)</li>
                        </ul>}
                    />
                    <FlowArrow />
                    <ModuleCard 
                        icon={FileText} color="#f59e0b" title="2. Facturation & Devis" 
                        content={<ul style={{ margin: 0, paddingLeft: '16px' }}>
                            <li>Génération d'engagements (C.A. Théorique)</li>
                            <li>Suivi des statuts (Brouillon, Envoyé, Retard)</li>
                            <li>Calculs HT / TTC / TVA</li>
                        </ul>}
                    />
                    <FlowArrow />
                    <ModuleCard 
                        icon={CreditCard} color="#10b981" title="3. Encaisseur & Règlements" 
                        content={<ul style={{ margin: 0, paddingLeft: '16px' }}>
                            <li>Capture des paiements (Totaux / Partiels)</li>
                            <li>Synchronisation automatique des montants restants</li>
                        </ul>}
                    />
                    <FlowArrow />
                    <ModuleCard 
                        icon={Landmark} color="#8b5cf6" title="4. Banque & Trésorerie" 
                        content={<ul style={{ margin: 0, paddingLeft: '16px' }}>
                            <li>Centralisation des flux réels (C.A. Encaissé)</li>
                            <li>Déduction des charges réelles</li>
                            <li>Bilan Net et Cashflow</li>
                        </ul>}
                    />
                </div>
            </SectionBlock>

            {/* DETAIL DES MODULES */}
            <SectionBlock title="Architecture & Méthodes de Calcul par Module" icon={Calculator}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                    
                    {/* Facturation */}
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', background: '#fafafa' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', color: '#f59e0b' }}>
                            <FileText size={18} /> Module Facturation
                        </h4>
                        <MetaProperty label="Variables Clés" type="text" value="montant (TTC), sousTotalHT, montantPaye, statut, dateEmi, echeance" />
                        <MetaProperty label="C.A. Facturé" type="formula" value="Σ montant (où statut ≠ 'Draft' et 'A faire')" />
                        <MetaProperty label="Reste à Encaisser" type="formula" value="montant - (montantPaye || 0)" />
                        <MetaProperty label="Logique Métier" type="text" value="Le système classe factures par statut en comparant Date.now() avec l'échéance. Si 'Partiel', le solde reste dû et devient 'Late' le lendemain de l'échéance." />
                        <MetaProperty label="TVA Déclarée" type="formula" value="montant(TTC) - sousTotalHT(HT)" />
                    </div>

                    {/* Encaissements & Banque */}
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', background: '#fafafa' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', color: '#10b981' }}>
                            <Landmark size={18} /> Module Banque & Dépenses
                        </h4>
                        <MetaProperty label="Variables Clés" type="text" value="amount, type (Credit/Debit), category, chargeType, date" />
                        <MetaProperty label="C.A. Réel Encaissé" type="formula" value="Σ amount (où type = 'Credit')" />
                        <MetaProperty label="Charges Réelles" type="formula" value="Σ amount (où type = 'Debit' AND category ≠ 'Perso' AND category ≠ 'TVA')" />
                        <MetaProperty label="Exclusion Perso" type="text" value="Les transactions taguées 'Perso' (catégorie) sont stockées pour la compta Lotfi mais exclues du calcul de rentabilité agence." />
                        <MetaProperty label="Source" type="text" value="Alimentée manuellement ou par synchronisation (M+1 Salaires, ou facture payée)." />
                    </div>

                    {/* Indicateurs Trésorerie */}
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', background: '#fafafa' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', color: '#8b5cf6' }}>
                            <TrendingUp size={18} /> Rapports & Trésorerie
                        </h4>
                        <MetaProperty label="Bénéfice Théorique" type="formula" value="C.A. Facturé - Charges Réelles" />
                        <MetaProperty label="Bénéfice Réel" type="formula" value="C.A. Réel Encaissé - Charges Réelles" />
                        <MetaProperty label="Cashflow Net" type="formula" value="Bénéfice Réel - TVA Reversée à l'État" />
                        <MetaProperty label="Analytique Client" type="text" value="Le bénéfice par client isole les paiements de ce client et soustrait uniquement ses charges allouées (RH) sauvegardées dans la fiche client." />
                    </div>
                </div>
            </SectionBlock>

            {/* GESTION DES CAS SPECIFIQUES ET ERREURS */}
            <SectionBlock title="Mécanismes de Sécurité et Validations" icon={CheckCircle}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <RefreshCw size={24} color="#3b82f6" />
                        <div>
                            <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '800' }}>Évitement des doublons</h5>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Chaque facture, client ou transaction se voit attribuer un identifiant (ID) unique basé sur un timestamp au moment de la création (`Date.now()`). C'est la clé primaire utilisée lors des mappages et modifications (Edit/Delete) garantissant qu'aucune ligne ne s'écrase ou ne se double.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <AlertTriangle size={24} color="#f59e0b" />
                        <div>
                            <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '800' }}>Paiements Partiels</h5>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Contrairement à un simple on/off, la plateforme suit l'attribut `montantPaye`. Le calcul financier (Trésorerie) utilise ce champ exact. La facture maintient le statut Actif tant que `montantPaye &lt; montant TTC`.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <Database size={24} color="#10b981" />
                        <div>
                            <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '800' }}>Incohérence des Soldes</h5>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Les vues Agrégées (ConfigPage, FinancePage) ne stockent pas de montants statiques calculés par le passé. À chaque affichage, le moteur parcourt l'ensemble des transactions (Single Source of Truth) à la volée. Ainsi, modifier une vieille facture met mathématiquement à jour tous les bilans en temps réel.</p>
                        </div>
                    </div>
                </div>
            </SectionBlock>

        </div>
    );
};

export default CalculsOrganigramme;
