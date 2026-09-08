"""
D6 – Provenance & Evidence Modell (W3C PROV-DM)
=================================================
Modelliert die Entstehung von CMRSRecords nach W3C PROV-DM.
Entity – Activity – Agent Triad.

PROV-Zuordnung:
  prov:Entity       → RawInputText, CMRSRecord
  prov:Activity     → mapping_activity (manual | parser_vX)
  prov:Agent        → human_annotator / tool
  prov:wasGeneratedBy  → CMRSRecord ← mapping_activity
  prov:used            → mapping_activity → RawInputText
  prov:wasAssociatedWith → mapping_activity → Agent
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
import json
import uuid


# ─── PROV Entities ───────────────────────────────────────────────────────────

@dataclass
class ProvAgent:
    agent_id: str
    agent_type: str          # "human_annotator" | "tool"
    label: str
    version: Optional[str] = None

    def to_prov_dict(self) -> dict:
        d = {
            "prov:type": self.agent_type,
            "prov:label": self.label,
        }
        if self.version:
            d["cmrs:version"] = self.version
        return {self.agent_id: d}


@dataclass
class ProvActivity:
    activity_id: str
    activity_type: str       # "mapping_activity"
    started_at: str
    ended_at: Optional[str] = None
    used_entity_id: Optional[str] = None    # RawInputText entity id
    associated_agent_id: Optional[str] = None
    attributes: dict = field(default_factory=dict)

    def to_prov_dict(self) -> dict:
        d = {
            "prov:type": self.activity_type,
            "prov:startedAtTime": self.started_at,
        }
        if self.ended_at:
            d["prov:endedAtTime"] = self.ended_at
        d.update(self.attributes)
        return {self.activity_id: d}


@dataclass
class ProvEntity:
    entity_id: str
    entity_type: str         # "RawInputText" | "CMRSRecord"
    attributes: dict = field(default_factory=dict)
    generated_by: Optional[str] = None     # activity_id
    was_derived_from: Optional[str] = None # other entity_id

    def to_prov_dict(self) -> dict:
        d = {"prov:type": self.entity_type}
        d.update(self.attributes)
        return {self.entity_id: d}


@dataclass
class ProvenanceBundle:
    """
    Kompletter PROV-Bundle für einen CMRSRecord.
    Enthält alle Entities, Activities und Agents sowie Relations.
    """
    bundle_id: str
    entities: list[ProvEntity] = field(default_factory=list)
    activities: list[ProvActivity] = field(default_factory=list)
    agents: list[ProvAgent] = field(default_factory=list)

    def to_prov_n_dict(self) -> dict:
        """Serialisiert als PROV-N-ähnliches JSON (vereinfacht)."""
        result: dict = {
            "@context": {
                "prov": "http://www.w3.org/ns/prov#",
                "cmrs": "https://cmrs.example.org/vocab#",
                "xsd": "http://www.w3.org/2001/XMLSchema#",
            },
            "bundle": self.bundle_id,
            "entity": {},
            "activity": {},
            "agent": {},
            "wasGeneratedBy": [],
            "used": [],
            "wasAssociatedWith": [],
            "wasDerivedFrom": [],
        }

        for e in self.entities:
            result["entity"].update(e.to_prov_dict())

        for a in self.activities:
            result["activity"].update(a.to_prov_dict())
            if a.used_entity_id:
                result["used"].append({
                    "activity": a.activity_id,
                    "entity": a.used_entity_id,
                })
            if a.associated_agent_id:
                result["wasAssociatedWith"].append({
                    "activity": a.activity_id,
                    "agent": a.associated_agent_id,
                })

        for agent in self.agents:
            result["agent"].update(agent.to_prov_dict())

        for e in self.entities:
            if e.generated_by:
                result["wasGeneratedBy"].append({
                    "entity": e.entity_id,
                    "activity": e.generated_by,
                })
            if e.was_derived_from:
                result["wasDerivedFrom"].append({
                    "generatedEntity": e.entity_id,
                    "usedEntity": e.was_derived_from,
                })

        return result


# ─── Factory-Funktionen ───────────────────────────────────────────────────────

def build_provenance_bundle(
    cmrs_record: dict,
    agent_label: str = "CMRS Parser v1",
    agent_type: str = "tool",
) -> ProvenanceBundle:
    """
    Erzeugt einen vollständigen PROV-Bundle für einen CMRSRecord.
    """
    prov = cmrs_record.get("provenance") or {}
    record_id = cmrs_record.get("id", str(uuid.uuid4()))
    created_at = prov.get("created_at", datetime.now(timezone.utc).isoformat())
    source = prov.get("source", "unknown")
    cmrs_version = prov.get("cmrs_version", "1.1.0")

    bundle_id = f"bundle:{record_id}"

    # Agent
    agent_id = f"agent:{source}"
    agent = ProvAgent(
        agent_id=agent_id,
        agent_type=agent_type,
        label=agent_label,
        version=cmrs_version,
    )

    # Activity
    activity_id = f"activity:mapping_{record_id}"
    raw_entity_id = f"entity:raw_{record_id}"
    activity = ProvActivity(
        activity_id=activity_id,
        activity_type="mapping_activity",
        started_at=created_at,
        ended_at=created_at,
        used_entity_id=raw_entity_id,
        associated_agent_id=agent_id,
        attributes={
            "cmrs:source": source,
            "cmrs:schema_version": cmrs_version,
        }
    )

    # Entity: RawInputText
    raw_text = (cmrs_record.get("raw_input") or {}).get("text", "")
    raw_entity = ProvEntity(
        entity_id=raw_entity_id,
        entity_type="RawInputText",
        attributes={
            "cmrs:language": (cmrs_record.get("raw_input") or {}).get("language", "de"),
            "cmrs:text_length": len(raw_text),
        }
    )

    # Entity: CMRSRecord
    cmrs_entity = ProvEntity(
        entity_id=f"entity:cmrs_{record_id}",
        entity_type="CMRSRecord",
        attributes={
            "cmrs:record_id": record_id,
            "cmrs:record_type": cmrs_record.get("type", "unknown"),
            "cmrs:material_category": (cmrs_record.get("material") or {}).get("category", "unknown"),
        },
        generated_by=activity_id,
        was_derived_from=raw_entity_id,
    )

    return ProvenanceBundle(
        bundle_id=bundle_id,
        entities=[raw_entity, cmrs_entity],
        activities=[activity],
        agents=[agent],
    )


def attach_provenance(cmrs_record: dict) -> dict:
    """
    Erweitert ein CMRSRecord um einen serialisierten PROV-Bundle.
    Gibt ein erweitertes dict zurück.
    """
    bundle = build_provenance_bundle(cmrs_record)
    record_with_prov = dict(cmrs_record)
    record_with_prov["_prov_bundle"] = bundle.to_prov_n_dict()
    return record_with_prov


if __name__ == "__main__":
    sample = {
        "type": "offer",
        "id": "OFF-001",
        "raw_input": {"text": "500 kg PP-Regranulat, Feuchte max 0,3 %, Berlin.", "language": "de"},
        "material": {"label_raw": "PP-Regranulat", "category": "polymer"},
        "quantity": {"value": 500, "unit_ucum": "kg"},
        "context": {"location": "Berlin"},
        "provenance": {"created_at": "2025-12-28T00:00:00Z", "source": "manual", "cmrs_version": "1.1.0"},
    }
    result = attach_provenance(sample)
    print(json.dumps(result["_prov_bundle"], ensure_ascii=False, indent=2))
