FROM postgres:15

# Copy migration files
COPY migrations/ /docker-entrypoint-initdb.d/

# Set environment variables
ENV POSTGRES_DB=quaiqi
ENV POSTGRES_USER=quaiqi
ENV POSTGRES_PASSWORD=quaiqi_password

# The migrations will be automatically run by postgres:15's entrypoint script
# when the container starts up for the first time

# Expose PostgreSQL port
EXPOSE 5432 
