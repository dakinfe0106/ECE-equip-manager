import { countByType, type Asset } from './availability';

const sampleAssets: Asset[] = [
  { id: '0001', type: 'Laptop', status: 'Available' },
  { id: '0002', type: 'Laptop', status: 'On_Loan' },
  { id: '0003', type: 'Oscilloscope', status: 'Under_Maintenance' },
  { id: '0004', type: 'Oscilloscope', status: 'Available' },
  { id: '0005', type: 'Projector', status: 'Retired' },
];

export default function AvailabilitySummary() {
  const counts = countByType(sampleAssets);
  return (
    <table>
      <thead>
        <tr>
          <th>Type</th><th>Available</th><th>On loan</th><th>Maintenance</th><th>Retired</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(counts).map(([type, c]) => (
          <tr key={type}>
            <td>{type}</td><td>{c.Available}</td><td>{c.On_Loan}</td>
            <td>{c.Under_Maintenance}</td><td>{c.Retired}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}