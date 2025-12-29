
const API_URL = 'http://localhost:3000/api';

async function request(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed ${options.method || 'GET'} ${endpoint}: ${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function run() {
  try {
    console.log('--- Testing API Integration ---');

    // 1. Create Company
    console.log('Creating Company...');
    const company = await request('/companies', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Company',
        cnpj: '12345678901234'
      })
    });
    console.log('Company created:', company);

    // 2. Create Branch
    console.log('Creating Branch...');
    const branch = await request('/branches', {
      method: 'POST',
      body: JSON.stringify({
        companyId: company.id,
        name: 'Main Branch',
        address: '123 Main St'
      })
    });
    console.log('Branch created:', branch);

    // 3. Create Department
    console.log('Creating Department...');
    const department = await request('/departments', {
      method: 'POST',
      body: JSON.stringify({
        branchId: branch.id,
        name: 'Security Dept'
      })
    });
    console.log('Department created:', department);

    // 4. Create Person
    console.log('Creating Person...');
    const person = await request('/people', {
      method: 'POST',
      body: JSON.stringify({
        departmentId: department.id,
        name: 'John Doe',
        role: 'manager'
      })
    });
    console.log('Person created:', person);

    // 5. Create Geofence (complex structure)
    console.log('Creating Geofence...');
    const fenceData = {
      companyId: company.id,
      departmentId: department.id,
      name: 'Test Zone',
      color: '#ff0000',
      status: 'active',
      perimeters: [
        {
          type: 'polygon',
          coordinates: [[-23.55, -46.63], [-23.56, -46.64], [-23.57, -46.63]]
        }
      ],
      rules: [
        {
          name: 'Enter Rule',
          condition: 'enter',
          action: 'alert',
          actionConfig: { message: 'Alert entry' }
        }
      ],
      pins: []
    };
    const fence = await request('/geofences', {
      method: 'POST',
      body: JSON.stringify(fenceData)
    });
    console.log('Geofence created:', fence);

    // 6. Add Independent Perimeter
    console.log('Adding extra Perimeter...');
    const perimeter = await request('/perimeters', {
      method: 'POST',
      body: JSON.stringify({
        fenceId: fence.id,
        type: 'circle',
        center: [-23.55, -46.63],
        radius: 100
      })
    });
    console.log('Perimeter added:', perimeter);

    // 7. Add Pin
    console.log('Adding Pin...');
    const pin = await request('/geofence_pins', {
      method: 'POST',
      body: JSON.stringify({
        fenceId: fence.id,
        responsibleId: person.id,
        name: 'Check Point',
        coordinates: [-23.5505, -46.6305],
        status: 'pending'
      })
    });
    console.log('Pin added:', pin);

    // 8. Verify Data
    console.log('Verifying Geofence fetch...');
    const fetchedFence = await request(`/geofences/${fence.id}`);
    console.log('Fetched Fence:', JSON.stringify(fetchedFence, null, 2));

    if (fetchedFence.perimeters.length !== 2) throw new Error('Expected 2 perimeters');
    if (fetchedFence.rules.length !== 1) throw new Error('Expected 1 rule');
    if (fetchedFence.pins.length !== 1) throw new Error('Expected 1 pin');

    console.log('--- Test Passed Successfully ---');

  } catch (error) {
    console.error('Test Failed:', error);
    process.exit(1);
  }
}

run();
