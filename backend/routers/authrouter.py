from fastapi import APIRouter, Depends, HTTPException, status
from datetime import timedelta
from utils import database, models, auth

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/signup", response_model=models.User)
async def signup(user: models.UserCreate):
    # Check if user with email already exists
    db_user = auth.get_user_by_email(email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password
    hashed_password = auth.get_password_hash(user.password)
    firestore_user = database.FirestoreUser(
        email=user.email,
        firstname=user.firstname,
        lastname=user.lastname,
        gender=user.gender,
        hashed_password=hashed_password,
    )

    # Save to Firestore and get back created user
    created_user = database.create_user(firestore_user)

    # Convert to response model
    return models.User(
        id=created_user.id,
        email=created_user.email,
        firstname=created_user.firstname,
        lastname=created_user.lastname,
        gender=created_user.gender,
        is_active=created_user.is_active,
        created_at=created_user.created_at,
    )


@router.post("/login", response_model=models.Token)
async def login(login_data: models.UserLogin):
    """Login user and return access token"""
    print(login_data)
    user = auth.authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=models.User)
async def get_current_user_info(
    current_user: database.FirestoreUser = Depends(auth.get_current_active_user),
):
    """Get current user information"""
    return models.User(
        id=current_user.id,
        email=current_user.email,
        firstname=current_user.firstname,
        lastname=current_user.lastname,
        gender=current_user.gender,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )


@router.get("/user/{user_id}", response_model=models.User)
async def get_user_by_id(
    user_id: str,
    current_user: database.FirestoreUser = Depends(auth.get_current_active_user),
):
    """Get user information by ID (requires authentication)"""
    user = database.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return models.User(
        id=user.id,
        email=user.email,
        firstname=user.firstname,
        lastname=user.lastname,
        gender=user.gender,
        is_active=user.is_active,
        created_at=user.created_at,
    )
