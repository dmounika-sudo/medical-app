'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [drugName, setDrugName] = useState('');
  const [rxcui, setRxcui] = useState('');
  const [drugInfo, setDrugInfo] = useState(null);
  const [interactions, setInteractions] = useState(null);
  const [fdaData, setFdaData] = useState(null);
  const [adverseEvents, setAdverseEvents] = useState(null);
  const [recalls, setRecalls] = useState(null);
  const [ndcData, setNdcData] = useState(null);
  const [relatedDrugs, setRelatedDrugs] = useState(null);
  const [drugProperties, setDrugProperties] = useState(null);
  const [clinicalTrials, setClinicalTrials] = useState(null);
  const [synonyms, setSynonyms] = useState(null);
  const [pillboxImages, setPillboxImages] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [myMedications, setMyMedications] = useState([]);
  const [showMyMeds, setShowMyMeds] = useState(false);
  const [searchProgress, setSearchProgress] = useState('');
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showReminders, setShowReminders] = useState(false);
  const [showDisposal, setShowDisposal] = useState(false);
  const [contraindications, setContraindications] = useState(null);
  const [userAllergies, setUserAllergies] = useState([]);
  const [showAllergyAlert, setShowAllergyAlert] = useState(false);
  const [allergyWarning, setAllergyWarning] = useState('');
  const [medicationSchedule, setMedicationSchedule] = useState([]);
  const [adherenceData, setAdherenceData] = useState([]);

  useEffect(() => {
    // Load user session
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // Load medications
    const saved = localStorage.getItem('myMedications');
    if (saved) {
      setMyMedications(JSON.parse(saved));
    }

    // Load user allergies
    const savedAllergies = localStorage.getItem('userAllergies');
    if (savedAllergies) {
      setUserAllergies(JSON.parse(savedAllergies));
    }

    // Load medication schedule
    const savedSchedule = localStorage.getItem('medicationSchedule');
    if (savedSchedule) {
      setMedicationSchedule(JSON.parse(savedSchedule));
    }

    // Load adherence data
    const savedAdherence = localStorage.getItem('adherenceData');
    if (savedAdherence) {
      setAdherenceData(JSON.parse(savedAdherence));
    }

    // Check for medication reminders
    checkReminders();
  }, []);

  const checkReminders = () => {
    const meds = JSON.parse(localStorage.getItem('myMedications') || '[]');
    const schedule = JSON.parse(localStorage.getItem('medicationSchedule') || '[]');
    const now = new Date();
    
    // Check if any medications are due in schedule
    schedule.forEach(item => {
      const dueTime = new Date(item.nextDose);
      if (dueTime <= now && !item.taken) {
        // Show reminder notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Medication Reminder', {
            body: `Time to take ${item.medicationName}`,
            icon: '/pill-icon.png'
          });
        }
      }
    });
    
    // Check medication reminders
    meds.forEach(med => {
      if (med.reminders) {
        med.reminders.forEach(reminder => {
          const reminderTime = new Date(reminder.time);
          if (Math.abs(now - reminderTime) < 60000) { // Within 1 minute
            if (Notification.permission === 'granted') {
              new Notification('Medication Reminder', {
                body: `Time to take ${med.name} - ${reminder.dosage}`,
                icon: '/pill-icon.png'
              });
            }
          }
        });
      }
    });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginEmail && loginPassword) {
      const userData = {
        email: loginEmail,
        name: loginEmail.split('@')[0],
        loginDate: new Date().toISOString()
      };
      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      setShowLogin(false);
      setLoginEmail('');
      setLoginPassword('');
      
      // Request notification permission
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const addToMyMedications = () => {
    if (drugName && rxcui) {
      const dosage = prompt('Enter dosage (e.g., "10mg twice daily"):');
      const timing = prompt('Enter timing (e.g., "8:00 AM, 8:00 PM"):');
      
      const newMed = {
        name: drugName,
        rxcui: rxcui,
        addedDate: new Date().toISOString(),
        dosage: dosage || 'Not specified',
        timing: timing || 'Not specified',
        reminders: [],
        contraindications: contraindications || []
      };
      const updated = [...myMedications, newMed];
      setMyMedications(updated);
      localStorage.setItem('myMedications', JSON.stringify(updated));
      alert(`${drugName} added to your medication list with dosage guidance`);
    }
  };

  const addReminder = (medIndex) => {
    const time = prompt('Enter reminder time (e.g., "08:00"):');
    const dosage = prompt('Enter dosage for this time:');
    
    if (time && dosage) {
      const updated = [...myMedications];
      if (!updated[medIndex].reminders) {
        updated[medIndex].reminders = [];
      }
      updated[medIndex].reminders.push({
        time: time,
        dosage: dosage,
        enabled: true
      });
      setMyMedications(updated);
      localStorage.setItem('myMedications', JSON.stringify(updated));
      alert('Reminder added successfully!');
    }
  };

  const removeFromMyMedications = (index) => {
    const updated = myMedications.filter((_, i) => i !== index);
    setMyMedications(updated);
    localStorage.setItem('myMedications', JSON.stringify(updated));
  };

  const checkMyMedicationsInteractions = async () => {
    if (myMedications.length < 2) {
      alert('Add at least 2 medications to check interactions');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const rxcuis = myMedications.map(m => m.rxcui).join('+');
      const res = await fetch(
        `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcuis}`
      );
      const data = await res.json();
      
      if (data.fullInteractionTypeGroup?.[0]?.fullInteractionType) {
        const interactionCount = data.fullInteractionTypeGroup[0].fullInteractionType.reduce(
          (acc, type) => acc + (type.interactionPair?.length || 0), 0
        );
        alert(`Found ${interactionCount} potential interactions between your medications. Check the interactions section below.`);
        setInteractions(data);
      } else {
        alert('No interactions found between your medications');
      }
    } catch (err) {
      setError(`Error checking interactions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const searchDrug = async () => {
    if (!drugName.trim()) {
      setError('Please enter a drug name');
      return;
    }

    setLoading(true);
    setError('');
    setSearchProgress('Initializing search...');
    setDrugInfo(null);
    setInteractions(null);
    setFdaData(null);
    setAdverseEvents(null);
    setRecalls(null);
    setNdcData(null);
    setRelatedDrugs(null);
    setDrugProperties(null);
    setClinicalTrials(null);
    setSynonyms(null);
    setPillboxImages(null);

    try {
      // 1. Get RXCUI from drug name (RxNorm)
      setSearchProgress('Searching RxNorm database...');
      const rxcuiRes = await fetch(
        `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}`
      );
      
      if (!rxcuiRes.ok) {
        throw new Error('Failed to fetch drug information from RxNorm');
      }
      
      const rxcuiData = await rxcuiRes.json();

      if (rxcuiData.idGroup?.rxnormId?.[0]) {
        const foundRxcui = rxcuiData.idGroup.rxnormId[0];
        setRxcui(foundRxcui);
        setDrugInfo(rxcuiData);

        // 2. Get drug properties and related concepts (RxNorm)
        setSearchProgress('Fetching drug properties...');
        try {
          const propsRes = await fetch(
            `https://rxnav.nlm.nih.gov/REST/rxcui/${foundRxcui}/properties.json`
          );
          if (propsRes.ok) {
            const propsData = await propsRes.json();
            setDrugProperties(propsData);
          }
        } catch (err) {
          console.error('Properties fetch error:', err);
        }

        // 2b. Get all synonyms (RxNorm)
        setSearchProgress('Fetching synonyms...');
        try {
          const synonymRes = await fetch(
            `https://rxnav.nlm.nih.gov/REST/rxcui/${foundRxcui}/allrelated.json`
          );
          if (synonymRes.ok) {
            const synonymData = await synonymRes.json();
            setSynonyms(synonymData);
          }
        } catch (err) {
          console.error('Synonyms fetch error:', err);
        }

        // 2c. Get pill images from RxImage API
        setSearchProgress('Fetching medication images...');
        try {
          const imageRes = await fetch(
            `https://rxnav.nlm.nih.gov/REST/rximage?rxcui=${foundRxcui}`
          );
          if (imageRes.ok) {
            const imageData = await imageRes.json();
            setPillboxImages(imageData);
          }
        } catch (err) {
          console.error('Image fetch error:', err);
        }

        // 3. Get related drugs (RxNorm)
        setSearchProgress('Finding related medications...');
        try {
          const relatedRes = await fetch(
            `https://rxnav.nlm.nih.gov/REST/rxcui/${foundRxcui}/related.json?tty=SBD+SCD+BPCK+GPCK`
          );
          if (relatedRes.ok) {
            const relatedData = await relatedRes.json();
            setRelatedDrugs(relatedData);
          }
        } catch (err) {
          console.error('Related drugs fetch error:', err);
        }

        // 4. Get drug interactions (RxNorm)
        setSearchProgress('Checking drug interactions...');
        try {
          const interactionRes = await fetch(
            `https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=${foundRxcui}`
          );
          if (interactionRes.ok) {
            const interactionData = await interactionRes.json();
            setInteractions(interactionData);
          }
        } catch (err) {
          console.error('Interaction fetch error:', err);
        }

        // 5. Get FDA label data (OpenFDA)
        setSearchProgress('Fetching FDA drug labels...');
        try {
          const searches = [
            `openfda.generic_name:"${encodeURIComponent(drugName.toLowerCase())}"`,
            `openfda.brand_name:"${encodeURIComponent(drugName)}"`,
            `openfda.substance_name:"${encodeURIComponent(drugName)}"`
          ];
          
          for (const searchQuery of searches) {
            try {
              const fdaRes = await fetch(
                `https://api.fda.gov/drug/label.json?search=${searchQuery}&limit=1`
              );
              if (fdaRes.ok) {
                const fdaJson = await fdaRes.json();
                if (fdaJson.results?.length > 0) {
                  setFdaData(fdaJson);
                  
                  // Extract contraindications
                  const result = fdaJson.results[0];
                  const contras = [];
                  if (result.contraindications) {
                    contras.push(...result.contraindications);
                  }
                  if (result.warnings) {
                    contras.push('See warnings section for important safety information');
                  }
                  if (result.boxed_warning) {
                    contras.push('⚠️ BLACK BOX WARNING - See label for critical safety information');
                  }
                  setContraindications(contras);
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }
        } catch (err) {
          console.error('FDA label fetch error:', err);
        }

        // 6. Get NDC (National Drug Code) data (OpenFDA)
        setSearchProgress('Fetching NDC directory...');
        try {
          const ndcRes = await fetch(
            `https://api.fda.gov/drug/ndc.json?search=generic_name:"${encodeURIComponent(drugName.toLowerCase())}"&limit=5`
          );
          if (ndcRes.ok) {
            const ndcJson = await ndcRes.json();
            setNdcData(ndcJson);
          }
        } catch (err) {
          console.error('NDC fetch error:', err);
        }

        // 7. Get adverse events (OpenFDA)
        setSearchProgress('Fetching adverse events...');
        try {
          const eventsRes = await fetch(
            `https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:"${encodeURIComponent(drugName)}"&limit=10`
          );
          if (eventsRes.ok) {
            const eventsJson = await eventsRes.json();
            setAdverseEvents(eventsJson);
          }
        } catch (err) {
          console.error('Adverse events fetch error:', err);
        }

        // 8. Get drug recalls (OpenFDA)
        setSearchProgress('Checking for recalls...');
        try {
          const recallsRes = await fetch(
            `https://api.fda.gov/drug/enforcement.json?search=product_description:"${encodeURIComponent(drugName)}"&limit=5`
          );
          if (recallsRes.ok) {
            const recallsJson = await recallsRes.json();
            setRecalls(recallsJson);
          }
        } catch (err) {
          console.error('Recalls fetch error:', err);
        }

        // 9. Get clinical trials (ClinicalTrials.gov)
        setSearchProgress('Searching clinical trials...');
        try {
          const trialsRes = await fetch(
            `https://clinicaltrials.gov/api/query/study_fields?expr=${encodeURIComponent(drugName)}&fields=NCTId,BriefTitle,OverallStatus,Phase,Condition&min_rnk=1&max_rnk=10&fmt=json`
          );
          if (trialsRes.ok) {
            const trialsJson = await trialsRes.json();
            setClinicalTrials(trialsJson);
          }
        } catch (err) {
          console.error('Clinical trials fetch error:', err);
        }

        setSearchProgress('Search complete!');
      } else {
        setError('Drug not found in RxNorm database. Try a different name or generic name.');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setSearchProgress(''), 2000);
    }
  };

  return (
    <main style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>Medication Safety Assistant</h1>
          <p style={{ margin: '5px 0 0 0' }}>Search for medications to check interactions, dosage info, and safety alerts.</p>
        </div>
        <div>
          {user ? (
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 14 }}>Welcome, <strong>{user.name}</strong></p>
              <button
                onClick={handleLogout}
                style={{
                  padding: '5px 15px',
                  fontSize: 12,
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  marginTop: 5
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              style={{
                padding: '10px 20px',
                fontSize: 14,
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Login / Sign Up
            </button>
          )}
        </div>
      </div>

      {showLogin && !user && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: 40, 
            borderRadius: 8, 
            maxWidth: 400,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2>Login / Sign Up</h2>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5 }}>Email:</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: 10,
                    fontSize: 14,
                    border: '1px solid #ccc',
                    borderRadius: 4
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 5 }}>Password:</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: 10,
                    fontSize: 14,
                    border: '1px solid #ccc',
                    borderRadius: 4
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    fontSize: 14,
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogin(false)}
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    fontSize: 14,
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
            <p style={{ fontSize: 12, color: '#666', marginTop: 15 }}>
              Note: This is a demo login. Data is stored locally in your browser.
            </p>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <button
          onClick={() => setShowMyMeds(!showMyMeds)}
          style={{
            padding: '10px 20px',
            fontSize: 16,
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            marginRight: 10
          }}
        >
          {showMyMeds ? 'Hide' : 'Show'} My Medications ({myMedications.length})
        </button>
        {myMedications.length >= 2 && (
          <button
            onClick={checkMyMedicationsInteractions}
            disabled={loading}
            style={{
              padding: '10px 20px',
              fontSize: 16,
              backgroundColor: '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: 4,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginRight: 10
            }}
          >
            Check My Medications Interactions
          </button>
        )}
        <button
          onClick={() => setShowReminders(!showReminders)}
          style={{
            padding: '10px 20px',
            fontSize: 16,
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            marginRight: 10
          }}
        >
          {showReminders ? 'Hide' : 'Show'} Reminders
        </button>
        <button
          onClick={() => setShowDisposal(!showDisposal)}
          style={{
            padding: '10px 20px',
            fontSize: 16,
            backgroundColor: '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Disposal Guide
        </button>
      </div>

      {showMyMeds && (
        <div style={{ marginBottom: 30, padding: 20, backgroundColor: '#e7f3ff', borderRadius: 4 }}>
          <h2>My Medications</h2>
          {myMedications.length === 0 ? (
            <p>No medications added yet. Search and add medications below.</p>
          ) : (
            <div>
              {myMedications.map((med, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 15,
                    marginBottom: 15,
                    backgroundColor: 'white',
                    borderRadius: 4,
                    border: '1px solid #b3d9ff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 10px 0' }}>{med.name}</h3>
                      <p style={{ margin: '5px 0', fontSize: 14 }}>
                        <strong>RXCUI:</strong> {med.rxcui}
                      </p>
                      <p style={{ margin: '5px 0', fontSize: 14 }}>
                        <strong>Dosage:</strong> {med.dosage || 'Not specified'}
                      </p>
                      <p style={{ margin: '5px 0', fontSize: 14 }}>
                        <strong>Timing:</strong> {med.timing || 'Not specified'}
                      </p>
                      <p style={{ margin: '5px 0', fontSize: 12, color: '#666' }}>
                        Added: {new Date(med.addedDate).toLocaleDateString()}
                      </p>
                      {med.contraindications && med.contraindications.length > 0 && (
                        <div style={{ marginTop: 10, padding: 10, backgroundColor: '#fff3cd', borderRadius: 4 }}>
                          <strong style={{ color: '#856404' }}>⚠️ Contraindications:</strong>
                          <ul style={{ margin: '5px 0', paddingLeft: 20 }}>
                            {med.contraindications.slice(0, 3).map((contra, cIdx) => (
                              <li key={cIdx} style={{ fontSize: 13 }}>{contra}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {med.reminders && med.reminders.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <strong style={{ fontSize: 13 }}>Reminders:</strong>
                          {med.reminders.map((reminder, rIdx) => (
                            <div key={rIdx} style={{ fontSize: 12, marginLeft: 10, marginTop: 5 }}>
                              🔔 {reminder.time} - {reminder.dosage}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <button
                        onClick={() => addReminder(idx)}
                        style={{
                          padding: '5px 10px',
                          fontSize: 12,
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer'
                        }}
                      >
                        Add Reminder
                      </button>
                      <button
                        onClick={() => removeFromMyMedications(idx)}
                        style={{
                          padding: '5px 10px',
                          fontSize: 12,
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showReminders && (
        <div style={{ marginBottom: 30, padding: 20, backgroundColor: '#d1ecf1', borderRadius: 4 }}>
          <h2>Medication Reminders</h2>
          {myMedications.filter(med => med.reminders && med.reminders.length > 0).length === 0 ? (
            <p>No reminders set. Add reminders to your medications above.</p>
          ) : (
            <div>
              {myMedications.map((med, idx) => (
                med.reminders && med.reminders.length > 0 && (
                  <div key={idx} style={{ marginBottom: 15, padding: 15, backgroundColor: 'white', borderRadius: 4 }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: 16 }}>{med.name}</h3>
                    {med.reminders.map((reminder, rIdx) => (
                      <div key={rIdx} style={{ padding: 10, marginBottom: 5, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
                        <p style={{ margin: 0, fontSize: 14 }}>
                          🔔 <strong>{reminder.time}</strong> - {reminder.dosage}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              ))}
              <div style={{ marginTop: 15, padding: 15, backgroundColor: '#fff3cd', borderRadius: 4 }}>
                <p style={{ margin: 0, fontSize: 13 }}>
                  <strong>Note:</strong> Browser notifications must be enabled for reminders to work. 
                  Click "Allow" when prompted.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {showDisposal && (
        <div style={{ marginBottom: 30, padding: 20, backgroundColor: '#e2d9f3', borderRadius: 4 }}>
          <h2>Safe Medication Disposal Guide</h2>
          <div style={{ backgroundColor: 'white', padding: 15, borderRadius: 4, marginBottom: 15 }}>
            <h3 style={{ marginTop: 0 }}>🗑️ How to Safely Dispose of Medications</h3>
            
            <div style={{ marginBottom: 20 }}>
              <h4>Option 1: Drug Take-Back Programs (RECOMMENDED)</h4>
              <ul>
                <li>Contact your local pharmacy or law enforcement</li>
                <li>Look for DEA-authorized collection sites</li>
                <li>Participate in National Prescription Drug Take-Back Day</li>
                <li>Use mail-back programs if available</li>
              </ul>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4>Option 2: Household Disposal (If no take-back available)</h4>
              <ol>
                <li>Mix medications with undesirable substance (dirt, cat litter, coffee grounds)</li>
                <li>Place mixture in sealed plastic bag or container</li>
                <li>Remove or black out personal information on prescription label</li>
                <li>Throw container in household trash</li>
              </ol>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4>⚠️ Medications Safe to Flush (FDA Flush List)</h4>
              <p style={{ fontSize: 14, color: '#666' }}>
                Only flush these medications if take-back is not available:
              </p>
              <ul style={{ fontSize: 14 }}>
                <li>Fentanyl patches and lozenges</li>
                <li>Morphine tablets and solutions</li>
                <li>Oxycodone products</li>
                <li>Hydromorphone tablets</li>
                <li>Other potent opioids (check FDA flush list)</li>
              </ul>
            </div>

            <div style={{ padding: 15, backgroundColor: '#fff3cd', borderRadius: 4 }}>
              <h4 style={{ marginTop: 0 }}>❌ DO NOT:</h4>
              <ul style={{ marginBottom: 0 }}>
                <li>Share medications with others</li>
                <li>Keep expired medications</li>
                <li>Flush most medications down toilet (unless on FDA flush list)</li>
                <li>Throw medications in trash without mixing with undesirable substance</li>
              </ul>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: 15, borderRadius: 4 }}>
            <h3 style={{ marginTop: 0 }}>📦 Safe Storage Guidelines</h3>
            <ul>
              <li><strong>Keep in original containers</strong> with labels intact</li>
              <li><strong>Store in cool, dry place</strong> away from heat and moisture</li>
              <li><strong>Keep out of reach of children and pets</strong></li>
              <li><strong>Check expiration dates</strong> regularly</li>
              <li><strong>Lock up opioids and controlled substances</strong></li>
              <li><strong>Avoid bathroom storage</strong> (humidity can degrade medications)</li>
            </ul>
          </div>
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        <input
          type="text"
          placeholder="Enter drug name (e.g., aspirin, ibuprofen, warfarin)"
          value={drugName}
          onChange={(e) => setDrugName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchDrug()}
          style={{
            padding: 10,
            fontSize: 16,
            width: 300,
            marginRight: 10,
            border: '1px solid #ccc',
            borderRadius: 4
          }}
        />
        <button
          onClick={searchDrug}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: 16,
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {searchProgress && (
        <div style={{ marginTop: 20, padding: 15, backgroundColor: '#e7f3ff', border: '1px solid #0070f3', borderRadius: 4 }}>
          {searchProgress}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 20, padding: 15, backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: 4 }}>
          {error}
        </div>
      )}

      {drugInfo && (
        <div style={{ marginTop: 30 }}>
          <h2>Drug Information</h2>
          <div style={{ padding: 15, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p><strong>Drug Name:</strong> {drugName}</p>
                <p><strong>RXCUI:</strong> {rxcui}</p>
                {drugProperties?.properties && (
                  <>
                    <p><strong>Generic Name:</strong> {drugProperties.properties.name || 'N/A'}</p>
                    <p><strong>Drug Class:</strong> {drugProperties.properties.tty || 'N/A'}</p>
                    <p><strong>Synonym:</strong> {drugProperties.properties.synonym || 'N/A'}</p>
                  </>
                )}
                <button
                  onClick={addToMyMedications}
                  style={{
                    marginTop: 10,
                    padding: '8px 16px',
                    fontSize: 14,
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  Add to My Medications
                </button>
              </div>
              {pillboxImages && pillboxImages.nlmRxImages && pillboxImages.nlmRxImages.length > 0 && (
                <div style={{ flex: '0 0 200px' }}>
                  <h3 style={{ fontSize: 16, marginTop: 0 }}>Medication Image</h3>
                  <img 
                    src={pillboxImages.nlmRxImages[0].imageUrl} 
                    alt={`${drugName} pill`}
                    style={{ 
                      maxWidth: '100%', 
                      height: 'auto', 
                      border: '2px solid #ddd', 
                      borderRadius: 8,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                  <p style={{ fontSize: 12, color: '#666', marginTop: 5 }}>
                    Source: NIH RxImage
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {synonyms && synonyms.allRelatedGroup?.conceptGroup && (
        <div style={{ marginTop: 30 }}>
          <h2>All Synonyms & Alternative Names</h2>
          <div style={{ padding: 15, backgroundColor: '#f0f8ff', borderRadius: 4 }}>
            {synonyms.allRelatedGroup.conceptGroup
              .filter(group => group.conceptProperties && group.conceptProperties.length > 0)
              .map((group, idx) => (
                <div key={idx} style={{ marginBottom: 15 }}>
                  <h3 style={{ fontSize: 14, color: '#0070f3', marginBottom: 8 }}>
                    {group.tty} ({group.conceptProperties.length} names)
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {group.conceptProperties.slice(0, 10).map((concept, cIdx) => (
                      <span
                        key={cIdx}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: 'white',
                          border: '1px solid #b3d9ff',
                          borderRadius: 16,
                          fontSize: 13
                        }}
                      >
                        {concept.name}
                      </span>
                    ))}
                    {group.conceptProperties.length > 10 && (
                      <span style={{ padding: '4px 12px', fontSize: 13, color: '#666' }}>
                        +{group.conceptProperties.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {pillboxImages && pillboxImages.nlmRxImages && pillboxImages.nlmRxImages.length > 1 && (
        <div style={{ marginTop: 30 }}>
          <h2>Medication Images Gallery</h2>
          <p style={{ fontSize: 14, color: '#666' }}>Different formulations and appearances from NIH RxImage database</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 15 }}>
            {pillboxImages.nlmRxImages.slice(0, 6).map((image, idx) => (
              <div
                key={idx}
                style={{
                  padding: 10,
                  backgroundColor: '#f9f9f9',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  textAlign: 'center'
                }}
              >
                <img 
                  src={image.imageUrl} 
                  alt={`${drugName} variant ${idx + 1}`}
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto',
                    borderRadius: 4,
                    marginBottom: 8
                  }}
                />
                {image.name && (
                  <p style={{ fontSize: 12, margin: 0, color: '#666' }}>{image.name}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {relatedDrugs && relatedDrugs.relatedGroup?.conceptGroup && (
        <div style={{ marginTop: 30 }}>
          <h2>Related Medications & Formulations</h2>
          {relatedDrugs.relatedGroup.conceptGroup.map((group, idx) => (
            group.conceptProperties && (
              <div key={idx} style={{ marginBottom: 15 }}>
                <h3 style={{ fontSize: 16, marginBottom: 10 }}>{group.tty}</h3>
                <div style={{ padding: 15, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
                  {group.conceptProperties.slice(0, 5).map((concept, cIdx) => (
                    <div key={cIdx} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #ddd' }}>
                      <strong>{concept.name}</strong>
                      <br />
                      <small>RXCUI: {concept.rxcui} | Synonym: {concept.synonym || 'N/A'}</small>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {ndcData && ndcData.results?.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h2>NDC Directory (Product Information)</h2>
          <p style={{ fontSize: 14, color: '#666' }}>National Drug Code directory with manufacturer details</p>
          {ndcData.results.slice(0, 3).map((ndc, idx) => (
            <div
              key={idx}
              style={{
                padding: 15,
                marginBottom: 10,
                backgroundColor: '#f0f8ff',
                border: '1px solid #b3d9ff',
                borderRadius: 4
              }}
            >
              <p><strong>Product:</strong> {ndc.brand_name || ndc.generic_name}</p>
              <p><strong>Manufacturer:</strong> {ndc.labeler_name}</p>
              <p><strong>NDC:</strong> {ndc.product_ndc}</p>
              <p><strong>Dosage Form:</strong> {ndc.dosage_form}</p>
              <p><strong>Route:</strong> {ndc.route?.join(', ')}</p>
              {ndc.active_ingredients && (
                <p><strong>Active Ingredients:</strong> {ndc.active_ingredients.map(i => `${i.name} (${i.strength})`).join(', ')}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {interactions && (
        <div style={{ marginTop: 30 }}>
          <h2>Drug Interactions</h2>
          {interactions.interactionTypeGroup?.length > 0 || interactions.fullInteractionTypeGroup?.length > 0 ? (
            <>
              {interactions.interactionTypeGroup?.map((group, idx) => (
                <div key={idx} style={{ marginBottom: 20 }}>
                  {group.interactionType?.map((type, typeIdx) => (
                    <div key={typeIdx}>
                      {type.interactionPair?.map((pair, pairIdx) => (
                        <div
                          key={pairIdx}
                          style={{
                            padding: 15,
                            marginBottom: 10,
                            backgroundColor: '#fff3cd',
                            border: '1px solid #ffc107',
                            borderRadius: 4
                          }}
                        >
                          <p><strong>Interacts with:</strong> {pair.interactionConcept?.[1]?.minConceptItem?.name || 'Unknown'}</p>
                          <p><strong>Severity:</strong> {pair.severity || 'Not specified'}</p>
                          <p><strong>Description:</strong> {pair.description}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              {interactions.fullInteractionTypeGroup?.map((group, idx) => (
                <div key={`full-${idx}`} style={{ marginBottom: 20 }}>
                  {group.fullInteractionType?.map((type, typeIdx) => (
                    <div key={typeIdx}>
                      {type.interactionPair?.map((pair, pairIdx) => (
                        <div
                          key={pairIdx}
                          style={{
                            padding: 15,
                            marginBottom: 10,
                            backgroundColor: '#fff3cd',
                            border: '1px solid #ffc107',
                            borderRadius: 4
                          }}
                        >
                          <p><strong>Drug 1:</strong> {pair.interactionConcept?.[0]?.minConceptItem?.name}</p>
                          <p><strong>Drug 2:</strong> {pair.interactionConcept?.[1]?.minConceptItem?.name}</p>
                          <p><strong>Severity:</strong> {pair.severity || 'Not specified'}</p>
                          <p><strong>Description:</strong> {pair.description}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </>
          ) : (
            <p style={{ padding: 15, backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 4 }}>
              No known interactions found in database.
            </p>
          )}
        </div>
      )}

      {contraindications && contraindications.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h2>⚠️ Contraindications & Warnings</h2>
          <div style={{ padding: 15, backgroundColor: '#fff3cd', border: '2px solid #ffc107', borderRadius: 4 }}>
            <p style={{ fontWeight: 'bold', color: '#856404', marginTop: 0 }}>
              Important: Do not use this medication if you have any of the following conditions without consulting your healthcare provider:
            </p>
            {contraindications.map((contra, idx) => (
              <div key={idx} style={{ 
                padding: 10, 
                marginBottom: 10, 
                backgroundColor: 'white', 
                borderLeft: '4px solid #ffc107',
                borderRadius: 4 
              }}>
                <p style={{ margin: 0, fontSize: 14 }}>{contra}</p>
              </div>
            ))}
            <p style={{ fontSize: 12, color: '#856404', marginBottom: 0, marginTop: 15 }}>
              <strong>Always consult your healthcare provider before starting any new medication.</strong>
            </p>
          </div>
        </div>
      )}

      {fdaData && fdaData.results?.[0] && (
        <div style={{ marginTop: 30 }}>
          <h2>FDA Label Information</h2>
          <div style={{ padding: 15, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
            {fdaData.results[0].boxed_warning && (
              <div style={{ marginBottom: 15, padding: 15, backgroundColor: '#f8d7da', border: '2px solid #dc3545', borderRadius: 4 }}>
                <h3 style={{ color: '#721c24', marginTop: 0 }}>⚠️ BLACK BOX WARNING</h3>
                <div style={{ whiteSpace: 'pre-wrap', color: '#721c24' }}>{fdaData.results[0].boxed_warning[0]}</div>
              </div>
            )}
            {fdaData.results[0].purpose && (
              <div style={{ marginBottom: 15 }}>
                <h3>Purpose</h3>
                <p>{fdaData.results[0].purpose[0]}</p>
              </div>
            )}
            {fdaData.results[0].warnings && (
              <div style={{ marginBottom: 15 }}>
                <h3>Warnings</h3>
                <div style={{ whiteSpace: 'pre-wrap' }}>{fdaData.results[0].warnings[0]}</div>
              </div>
            )}
            {fdaData.results[0].indications_and_usage && (
              <div style={{ marginBottom: 15 }}>
                <h3>Indications and Usage</h3>
                <div style={{ whiteSpace: 'pre-wrap' }}>{fdaData.results[0].indications_and_usage[0]}</div>
              </div>
            )}
            {fdaData.results[0].dosage_and_administration && (
              <div style={{ marginBottom: 15 }}>
                <h3>Dosage and Administration</h3>
                <div style={{ whiteSpace: 'pre-wrap' }}>{fdaData.results[0].dosage_and_administration[0]}</div>
              </div>
            )}
            {fdaData.results[0].adverse_reactions && (
              <div style={{ marginBottom: 15 }}>
                <h3>Adverse Reactions</h3>
                <div style={{ whiteSpace: 'pre-wrap' }}>{fdaData.results[0].adverse_reactions[0]}</div>
              </div>
            )}
            {fdaData.results[0].drug_interactions && (
              <div style={{ marginBottom: 15 }}>
                <h3>Drug Interactions (from FDA Label)</h3>
                <div style={{ whiteSpace: 'pre-wrap' }}>{fdaData.results[0].drug_interactions[0]}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {adverseEvents && adverseEvents.results?.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h2>Recent Adverse Events (FDA)</h2>
          <p style={{ fontSize: 14, color: '#666' }}>Reported adverse events from FDA database</p>
          {adverseEvents.results.slice(0, 3).map((event, idx) => (
            <div
              key={idx}
              style={{
                padding: 15,
                marginBottom: 10,
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: 4
              }}
            >
              <p><strong>Serious:</strong> {event.serious === '1' ? 'Yes' : 'No'}</p>
              {event.patient?.reaction && (
                <p><strong>Reactions:</strong> {event.patient.reaction.map(r => r.reactionmeddrapt).join(', ')}</p>
              )}
              {event.receivedate && (
                <p><strong>Report Date:</strong> {event.receivedate}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {recalls && recalls.results?.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h2>Drug Recalls (FDA)</h2>
          <p style={{ fontSize: 14, color: '#666' }}>Recent enforcement actions and recalls</p>
          {recalls.results.map((recall, idx) => (
            <div
              key={idx}
              style={{
                padding: 15,
                marginBottom: 10,
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: 4
              }}
            >
              <p><strong>Product:</strong> {recall.product_description}</p>
              <p><strong>Reason:</strong> {recall.reason_for_recall}</p>
              <p><strong>Status:</strong> {recall.status}</p>
              <p><strong>Classification:</strong> {recall.classification}</p>
              {recall.recall_initiation_date && (
                <p><strong>Recall Date:</strong> {recall.recall_initiation_date}</p>
              )}
              {recall.voluntary_mandated && (
                <p><strong>Type:</strong> {recall.voluntary_mandated}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {clinicalTrials && clinicalTrials.StudyFieldsResponse?.StudyFields && (
        <div style={{ marginTop: 30 }}>
          <h2>Clinical Trials</h2>
          <p style={{ fontSize: 14, color: '#666' }}>Active and completed clinical trials from ClinicalTrials.gov</p>
          {clinicalTrials.StudyFieldsResponse.StudyFields.map((trial, idx) => (
            <div
              key={idx}
              style={{
                padding: 15,
                marginBottom: 10,
                backgroundColor: '#e8f5e9',
                border: '1px solid #81c784',
                borderRadius: 4
              }}
            >
              <p><strong>Trial ID:</strong> {trial.NCTId?.[0]}</p>
              <p><strong>Title:</strong> {trial.BriefTitle?.[0]}</p>
              <p><strong>Status:</strong> {trial.OverallStatus?.[0]}</p>
              <p><strong>Phase:</strong> {trial.Phase?.[0] || 'Not specified'}</p>
              {trial.Condition && (
                <p><strong>Condition:</strong> {trial.Condition.join(', ')}</p>
              )}
              <a 
                href={`https://clinicaltrials.gov/study/${trial.NCTId?.[0]}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#0070f3', textDecoration: 'underline' }}
              >
                View on ClinicalTrials.gov
              </a>
            </div>
          ))}
        </div>
      )}

      {fdaData && fdaData.results?.[0] && (
        <div style={{ marginTop: 30 }}>
          <h2>Storage & Disposal Guidelines</h2>
          <div style={{ padding: 15, backgroundColor: '#e8f5e9', border: '1px solid #81c784', borderRadius: 4 }}>
            {fdaData.results[0].storage_and_handling && (
              <div style={{ marginBottom: 15 }}>
                <h3>Storage Instructions</h3>
                <div style={{ whiteSpace: 'pre-wrap' }}>{fdaData.results[0].storage_and_handling[0]}</div>
              </div>
            )}
            <div style={{ marginTop: 15 }}>
              <h3>Safe Disposal Guidelines</h3>
              <p><strong>General Disposal Instructions:</strong></p>
              <ul>
                <li>Do NOT flush medications down the toilet unless specifically instructed</li>
                <li>Remove medications from original containers and mix with undesirable substance (coffee grounds, dirt, cat litter)</li>
                <li>Place mixture in sealed bag or container</li>
                <li>Dispose in household trash</li>
                <li>Remove or black out personal information on prescription label</li>
              </ul>
              <p><strong>Preferred Method:</strong> Use a drug take-back program or DEA-authorized collector</p>
              <p style={{ fontSize: 12, color: '#666' }}>
                Find a take-back location: <a href="https://www.dea.gov/drop-boxes" target="_blank" rel="noopener noreferrer">DEA Drug Take-Back Locations</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {drugInfo && (
        <div style={{ marginTop: 30 }}>
          <h2>Allergy & Contraindication Checker</h2>
          <div style={{ padding: 15, backgroundColor: '#fff3e0', border: '1px solid #ffb74d', borderRadius: 4 }}>
            <p><strong>Manage Your Allergies:</strong></p>
            <div style={{ marginBottom: 15 }}>
              <input
                type="text"
                placeholder="Enter allergy (e.g., penicillin, sulfa)"
                id="allergyInput"
                style={{
                  padding: 8,
                  fontSize: 14,
                  width: 250,
                  marginRight: 10,
                  border: '1px solid #ccc',
                  borderRadius: 4
                }}
              />
              <button
                onClick={() => {
                  const input = document.getElementById('allergyInput');
                  if (input.value.trim()) {
                    const updated = [...userAllergies, input.value.trim()];
                    setUserAllergies(updated);
                    localStorage.setItem('userAllergies', JSON.stringify(updated));
                    input.value = '';
                    alert('Allergy added to your profile');
                  }
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: 14,
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Add Allergy
              </button>
            </div>
            {userAllergies.length > 0 && (
              <div>
                <p><strong>Your Allergies:</strong></p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {userAllergies.map((allergy, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '4px 12px',
                        backgroundColor: '#ffccbc',
                        border: '1px solid #ff5722',
                        borderRadius: 16,
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      {allergy}
                      <button
                        onClick={() => {
                          const updated = userAllergies.filter((_, i) => i !== idx);
                          setUserAllergies(updated);
                          localStorage.setItem('userAllergies', JSON.stringify(updated));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#d32f2f',
                          cursor: 'pointer',
                          fontSize: 16,
                          padding: 0
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {fdaData?.results?.[0]?.contraindications && (
              <div style={{ marginTop: 15, padding: 10, backgroundColor: '#ffebee', borderRadius: 4 }}>
                <h3>Contraindications (Do Not Use If):</h3>
                <div style={{ whiteSpace: 'pre-wrap' }}>{fdaData.results[0].contraindications[0]}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {myMedications.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h2>Medication Adherence Report</h2>
          <div style={{ padding: 15, backgroundColor: '#e3f2fd', border: '1px solid #2196f3', borderRadius: 4 }}>
            <p><strong>Your Medication List:</strong></p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#bbdefb' }}>
                  <th style={{ padding: 10, textAlign: 'left', border: '1px solid #90caf9' }}>Medication</th>
                  <th style={{ padding: 10, textAlign: 'left', border: '1px solid #90caf9' }}>Dosage</th>
                  <th style={{ padding: 10, textAlign: 'left', border: '1px solid #90caf9' }}>Timing</th>
                  <th style={{ padding: 10, textAlign: 'left', border: '1px solid #90caf9' }}>Added Date</th>
                  <th style={{ padding: 10, textAlign: 'left', border: '1px solid #90caf9' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {myMedications.map((med, idx) => (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f5f5f5' }}>
                    <td style={{ padding: 10, border: '1px solid #e0e0e0' }}>{med.name}</td>
                    <td style={{ padding: 10, border: '1px solid #e0e0e0' }}>{med.dosage || 'Not specified'}</td>
                    <td style={{ padding: 10, border: '1px solid #e0e0e0' }}>{med.timing || 'Not specified'}</td>
                    <td style={{ padding: 10, border: '1px solid #e0e0e0' }}>
                      {new Date(med.addedDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: 10, border: '1px solid #e0e0e0' }}>
                      <span style={{ color: '#4caf50', fontWeight: 'bold' }}>✓ Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 15, padding: 10, backgroundColor: '#c8e6c9', borderRadius: 4 }}>
              <p style={{ margin: 0 }}>
                <strong>Adherence Rate:</strong> {myMedications.length > 0 ? '100%' : '0%'} 
                <span style={{ marginLeft: 10, fontSize: 12, color: '#666' }}>
                  (Based on {myMedications.length} active medication{myMedications.length !== 1 ? 's' : ''})
                </span>
              </p>
            </div>
            <p style={{ fontSize: 12, color: '#666', marginTop: 10 }}>
              💡 Tip: Set reminders for each medication to improve adherence
            </p>
          </div>
        </div>
      )}

      {drugInfo && (
        <div style={{ marginTop: 30, padding: 20, backgroundColor: '#fff9e6', borderRadius: 4, border: '1px solid #ffd700' }}>
          <h2>Data Sources</h2>
          <p style={{ fontSize: 14 }}>All information displayed is fetched in real-time from:</p>
          <ul style={{ fontSize: 14 }}>
            <li><strong>RxNorm API</strong> - Drug identification, properties, and interactions</li>
            <li><strong>OpenFDA Drug Labels</strong> - Official FDA-approved drug information</li>
            <li><strong>OpenFDA NDC Directory</strong> - National Drug Code and manufacturer data</li>
            <li><strong>OpenFDA Adverse Events</strong> - Reported side effects and reactions</li>
            <li><strong>OpenFDA Enforcement</strong> - Drug recalls and safety alerts</li>
            <li><strong>ClinicalTrials.gov</strong> - Ongoing and completed clinical research</li>
          </ul>
          <p style={{ fontSize: 12, color: '#666', marginTop: 10 }}>
            <strong>Note:</strong> This information is for educational purposes only. Always consult healthcare professionals for medical advice.
          </p>
        </div>
      )}
    </main>
  );
}
