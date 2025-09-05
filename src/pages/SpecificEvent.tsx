import { useParams } from 'react-router-dom';

function SpecificEvent() {
    const { id } = useParams();
    return <div>Événement avec ID : {id}</div>;
}

export default SpecificEvent;