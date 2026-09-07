"use client";
import { RUN_SCHEMA_VERSION } from '../config/storage.ts';

import { useState } from 'react';
import type { Dataset } from '../domain/engine.ts';
import { validateDataset } from '../domain/engine.ts';
import type { ScoredChain,ScoreWeights } from '../types/model.ts';

function download(name:string,data:unknown) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function DatasetEditor({dataset,weights,results,onApply}:{dataset:Dataset;weights:ScoreWeights;results:ScoredChain[];onApply:(d:Dataset)=>void}) {
  const [draft,setDraft]=useState('');const [editing,setEditing]=useState(false);const [error,setError]=useState('');
  function apply() {
    try {const data=JSON.parse(draft);const issues=validateDataset(data);if(issues.length) {setError(issues.join('\n'));return;}onApply(data);setEditing(false);setError('');}
    catch {setError('Ungültiges JSON. Das bestehende Register wurde nicht verändert.');}
  }
  return <section className="page-grid dataset-editor">
    <h2>RQ2-Daten und Modellparameter</h2>
    <div className="form-actions">
      <button type="button" onClick={()=>{setDraft(JSON.stringify(dataset,null,2));setEditing(true);setError('');}}>Register bearbeiten</button>
      <button type="button" onClick={()=>download('rq2-register.json',dataset)}>Register exportieren</button>
      <button type="button" onClick={()=>download('rq2-berechnung.json',{schemaVersion:RUN_SCHEMA_VERSION,createdAt:new Date().toISOString(),dataset,weights,results})}>Berechnung exportieren</button>
      <label>Register importieren<input aria-label="Register importieren" type="file" accept=".json,application/json" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>5*1024*1024){setError('Datei überschreitet 5 MB.');return;}try {setDraft(await f.text());setEditing(true);setError('');} catch {setError('Datei konnte nicht gelesen werden. Das Register bleibt unverändert.');}}}/></label>
    </div>
    {editing&&<><label>Register und Modellkonfiguration<textarea aria-label="Register und Modellkonfiguration" spellCheck={false} rows={22} value={draft} onChange={e=>setDraft(e.target.value)}/></label><div className="form-actions"><button type="button" onClick={apply}>Prüfen und übernehmen</button><button type="button" onClick={()=>setEditing(false)}>Abbrechen</button></div></>}
    {error&&<pre role="alert" className="validation-errors">{error}</pre>}
  </section>;
}
