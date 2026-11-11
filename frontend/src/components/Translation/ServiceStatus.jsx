import React, { useEffect, useState } from 'react';
import api from '../../services/api';

/**
 * Whether the backend answers `GET /`, checked once when the page opens. It calls no model.
 * A healthy backend says nothing; only an unreachable one shows a banner.
 */
const ServiceStatus = () => {
  const [down, setDown] = useState(false);

  useEffect(() => {
    let live = true;
    api.health().catch(() => live && setDown(true));
    return () => {
      live = false;
    };
  }, []);

  return (
    <div role="status">
      {down && (
        <p className="banner-error">
          The translation service is unreachable, so nothing can be translated right now. Check that the backend is running, then reload the page.
        </p>
      )}
    </div>
  );
};

export default ServiceStatus;
