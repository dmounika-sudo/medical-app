export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const drugName = searchParams.get('drug');

  if (!drugName) {
    return Response.json({ error: 'Drug name required' }, { status: 400 });
  }

  try {
    const rxcuiRes = await fetch(
      `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}`
    );
    const data = await rxcuiRes.json();
    
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
