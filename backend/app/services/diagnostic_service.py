from typing import List, Dict, Any, Optional
import logging
import json
from functools import lru_cache
import httpx

from ..models.detection import Detection, DicomMetadata, DiagnosticReport
from ..core.config import get_settings

logger = logging.getLogger(__name__)


DENTAL_PROMPT = """You are a senior dental radiologist AI assistant providing comprehensive diagnostic reports based on dental X-ray AI detection results.

IMPORTANT: You must provide DETAILED, COMPREHENSIVE analysis. Do NOT give one-line generic responses.

## DETECTED CONDITIONS IN THIS X-RAY:
{detections}

## PATIENT INFORMATION:
{patient_info}

## YOUR TASK:
Analyze the above detection results and provide a COMPREHENSIVE diagnostic report. For EACH detected condition, you MUST include:

1. **Condition Identification**: What specific dental pathology is present (e.g., "Dental caries affecting the mesial surface", "Periapical lesion with radiolucency")

2. **Clinical Significance**: Why this finding is important, potential complications if untreated

3. **Detailed Treatment Plan**:
   - First-line treatment option with explanation
   - Alternative treatments if first-line fails
   - Expected timeline for treatment
   - Estimated number of dental visits needed

4. **Prognosis**: Expected outcome with proper treatment

5. **Home Care Instructions**: What the patient should do at home

6. **Follow-up Schedule**: When to return for check-up

## SEVERITY ASSESSMENT:
- "low" = Early stage, monitor at next regular checkup (6 months)
- "moderate" = Requires treatment within 1-3 months to prevent progression
- "high" = Urgent attention needed within 1-2 weeks, risk of pain/infection/tooth loss

## RESPONSE FORMAT (Return ONLY this JSON, no other text):
{{
    "report": "Write a DETAILED paragraph (minimum 150 words) describing each finding, its clinical significance, and treatment rationale. Be specific about tooth locations, sizes, and clinical implications.",
    "summary": "2-3 sentence summary highlighting the most critical finding and primary recommended action",
    "recommendations": [
        "SPECIFIC recommendation 1 with timeline (e.g., 'Schedule composite filling within 2 weeks for the detected cavity')",
        "SPECIFIC recommendation 2 (e.g., 'Apply prescription fluoride gel twice daily')",
        "SPECIFIC recommendation 3 (e.g., 'Use soft-bristled toothbrush and brush for 2 minutes twice daily')",
        "SPECIFIC follow-up recommendation (e.g., 'Return for progress X-ray in 6 months')"
    ],
    "severity_level": "low|moderate|high"
}}

Remember: Patients deserve DETAILED explanations, not generic one-liners. Be thorough and professional."""


class DiagnosticReportService:
    """Service for generating diagnostic reports using Google Gemini REST API"""

    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.gemini_api_key
        self.model = self.settings.gemini_model
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        logger.info(f"DiagnosticReportService initialized with model: {self.model}")

    async def generate_diagnostic_report(
        self,
        detections: List[Detection],
        metadata: Optional[DicomMetadata] = None,
        image_info: Optional[Dict[str, Any]] = None,
    ) -> DiagnosticReport:
        """Generate a diagnostic report from detection results"""

        detection_text = self._format_detections(detections)
        patient_info = self._format_patient_info(metadata)

        prompt = DENTAL_PROMPT.format(
            detections=detection_text,
            patient_info=patient_info,
        )

        try:
            logger.info(f"Calling Gemini API with {len(detections)} detections")
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.api_url}?key={self.api_key}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.4,
                            "maxOutputTokens": 4096,
                            "topP": 0.95,
                        }
                    },
                    headers={"Content-Type": "application/json"},
                )
                
                logger.info(f"Gemini API response status: {response.status_code}")
                
                if response.status_code != 200:
                    error_text = response.text
                    logger.error(f"Gemini API error: {response.status_code} - {error_text}")
                    raise Exception(f"Gemini API error: {response.status_code} - {error_text}")
                
                result = response.json()
                logger.info(f"Gemini API response received successfully")
                
                # Extract text from response
                if "candidates" not in result or len(result["candidates"]) == 0:
                    logger.error(f"No candidates in Gemini response: {result}")
                    raise Exception("No candidates in Gemini response")
                
                text = result["candidates"][0]["content"]["parts"][0]["text"]
                logger.info(f"Gemini response text length: {len(text)} chars")
                
                return self._parse_response(text, detections)

        except Exception as e:
            logger.error(f"Failed to generate diagnostic report: {e}", exc_info=True)
            return self._create_fallback_report(detections)

    def _parse_response(self, text: str, detections: List[Detection]) -> DiagnosticReport:
        """Parse the Gemini response into a DiagnosticReport"""
        try:
            clean_text = text.strip()
            
            # Remove markdown code blocks
            if "```json" in clean_text:
                start = clean_text.find("```json") + 7
                end = clean_text.find("```", start)
                clean_text = clean_text[start:end].strip()
            elif "```" in clean_text:
                start = clean_text.find("```") + 3
                end = clean_text.find("```", start)
                clean_text = clean_text[start:end].strip()
            
            logger.info(f"Parsing JSON response: {clean_text[:200]}...")
            
            data = json.loads(clean_text)
            
            # Validate required fields
            report = DiagnosticReport(
                report=data.get("report", "Analysis complete"),
                summary=data.get("summary", "See detailed analysis"),
                recommendations=data.get("recommendations", ["Consult dental professional"]),
                severity_level=data.get("severity_level", "moderate"),
            )
            
            logger.info(f"Successfully parsed diagnostic report with {len(report.recommendations)} recommendations")
            return report
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}, text: {text[:500]}")
            # If JSON parsing fails, try to use the text as-is
            return DiagnosticReport(
                report=text,
                summary="AI analysis completed - see detailed report",
                recommendations=["Review the detailed analysis above", "Consult dental professional"],
                severity_level="moderate",
            )
        except Exception as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            return self._create_fallback_report(detections)

    def _create_fallback_report(self, detections: List[Detection]) -> DiagnosticReport:
        """Create a detailed fallback report when API fails"""
        if not detections:
            return DiagnosticReport(
                report="No significant pathological findings were detected in this dental radiograph. The analyzed areas appear within normal limits.",
                summary="No abnormalities detected. Routine dental care recommended.",
                recommendations=[
                    "Continue regular dental checkups every 6 months",
                    "Maintain proper brushing technique twice daily",
                    "Use dental floss daily",
                    "Consider fluoride mouthwash for cavity prevention"
                ],
                severity_level="low",
            )
        
        # Build detailed fallback based on detected conditions
        conditions = [d.class_ for d in detections]
        condition_counts = {}
        for c in conditions:
            condition_counts[c] = condition_counts.get(c, 0) + 1
        
        report_parts = [f"AI analysis has identified {len(detections)} area(s) of concern in this dental radiograph:\n"]
        recommendations = []
        severity = "moderate"
        
        for condition, count in condition_counts.items():
            cond_lower = condition.lower()
            
            if "cavity" in cond_lower or "caries" in cond_lower:
                report_parts.append(f"• {count} dental caries (cavity) detection(s): Dental caries represent demineralization of tooth structure caused by bacterial acid production. Early intervention with restorative treatment can prevent progression to pulp involvement.")
                recommendations.extend([
                    f"Schedule dental appointment for {count} detected cavit{'y' if count == 1 else 'ies'} - treatment with composite or amalgam filling recommended",
                    "Reduce sugar intake and acidic beverages",
                    "Use fluoride toothpaste and consider prescription-strength fluoride gel"
                ])
            elif "periapical" in cond_lower or "lesion" in cond_lower or "pa" in cond_lower:
                severity = "high"
                report_parts.append(f"• {count} periapical lesion detection(s): Periapical lesions indicate infection or inflammation at the tooth root apex, often resulting from pulp necrosis. This requires prompt endodontic evaluation.")
                recommendations.extend([
                    "URGENT: Schedule endodontic (root canal) evaluation within 1-2 weeks",
                    "Monitor for increased pain, swelling, or fever - seek immediate care if symptoms worsen",
                    "Antibiotics may be prescribed if active infection is present"
                ])
            else:
                report_parts.append(f"• {count} {condition} detection(s): This finding requires professional dental evaluation to determine appropriate treatment.")
                recommendations.append(f"Consult dental professional regarding {condition} finding")
        
        recommendations.append("Follow up as directed by your dental professional")
        
        return DiagnosticReport(
            report="\n\n".join(report_parts),
            summary=f"Detected {len(detections)} finding(s) requiring professional evaluation. {'Urgent attention recommended.' if severity == 'high' else 'Schedule dental appointment soon.'}",
            recommendations=recommendations[:5],  # Limit to 5 recommendations
            severity_level=severity,
        )

    def _format_detections(self, detections: List[Detection]) -> str:
        if not detections:
            return "No pathological findings detected in this X-ray."

        formatted = []
        for i, detection in enumerate(detections, 1):
            conf_pct = detection.confidence * 100
            conf_level = "HIGH" if conf_pct > 80 else "MODERATE" if conf_pct > 50 else "LOW"
            
            formatted.append(
                f"FINDING #{i}:\n"
                f"  - Condition: {detection.class_}\n"
                f"  - AI Confidence: {conf_pct:.1f}% ({conf_level})\n"
                f"  - Location: Position ({detection.x}, {detection.y}) in image\n"
                f"  - Approximate Size: {detection.width} x {detection.height} pixels"
            )
        return "\n\n".join(formatted)

    def _format_patient_info(self, metadata: Optional[DicomMetadata]) -> str:
        if not metadata:
            return "Patient demographics not available from image metadata."
        
        parts = []
        if metadata.patient_id:
            parts.append(f"Patient ID: {metadata.patient_id}")
        if metadata.patient_sex:
            parts.append(f"Sex: {metadata.patient_sex}")
        if metadata.study_date:
            parts.append(f"Study Date: {metadata.study_date}")
        if metadata.modality:
            parts.append(f"Modality: {metadata.modality}")
            
        return "\n".join(parts) if parts else "Limited patient information available."


@lru_cache()
def get_diagnostic_report_service() -> DiagnosticReportService:
    return DiagnosticReportService()
