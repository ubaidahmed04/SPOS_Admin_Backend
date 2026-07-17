--------------------------------------------------------------------------------
-- SMART HOME APPLIANCES - ORACLE 11g DB SCRIPT (v2)
-- Modules: REGION, VENDOR, BRANCH, MODEL
-- Convention: status = 0 (Active) | 1 (Inactive / Soft-Deleted)
--             createdby / editby = '<user> | <DD-MON-YYYY HH24:MI:SS>'
-- v2 change: add_edit procedures now use NVL(new_value, current_value) on
--            UPDATE so a NULL passed in from the app keeps the old data.
--------------------------------------------------------------------------------

SET DEFINE OFF;

--================================================================================
-- 1. SEQUENCES
--================================================================================
CREATE SEQUENCE seq_region START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_vendor START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_branch START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE seq_model  START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;


--================================================================================
-- 2. TABLES
--================================================================================

-- ---------------- REGION ----------------
CREATE TABLE region
(
  regionid    INTEGER        NOT NULL,
  regionname  VARCHAR2(100)  NOT NULL,
  status      NUMBER(1,0)    DEFAULT 0 NOT NULL,
  createdby   VARCHAR2(80),
  editby      VARCHAR2(80),
  CONSTRAINT pk_region PRIMARY KEY (regionid)
);

-- ---------------- VENDOR ----------------
CREATE TABLE vendor
(
  vendorid    INTEGER        NOT NULL,
  company     VARCHAR2(100)  NOT NULL,
  contact     VARCHAR2(100),
  phone       VARCHAR2(20),
  email       VARCHAR2(100),
  address     VARCHAR2(200),
  status      NUMBER(1,0)    DEFAULT 0 NOT NULL,
  createdby   VARCHAR2(80),
  editby      VARCHAR2(80),
  CONSTRAINT pk_vendor PRIMARY KEY (vendorid)
);

-- ---------------- BRANCH ----------------
CREATE TABLE branch
(
  branchid    INTEGER        NOT NULL,
  branchname  VARCHAR2(100)  NOT NULL,
  regionid    INTEGER        NOT NULL,
  address     VARCHAR2(200),
  status      NUMBER(1,0)    DEFAULT 0 NOT NULL,
  createdby   VARCHAR2(80),
  editby      VARCHAR2(80),
  CONSTRAINT pk_branch PRIMARY KEY (branchid),
  CONSTRAINT fk_branch_region FOREIGN KEY (regionid) REFERENCES region (regionid)
);

-- ---------------- MODEL -----------------
CREATE TABLE model
(
  modelid     INTEGER        NOT NULL,
  vendorid    INTEGER        NOT NULL,
  regionid    INTEGER        NOT NULL,
  modelname   VARCHAR2(150)  NOT NULL,
  modelcode   VARCHAR2(50)   NOT NULL,
  mrp         NUMBER(12,2)   DEFAULT 0,
  cash        NUMBER(12,2)   DEFAULT 0,
  hscode      VARCHAR2(20),
  status      NUMBER(1,0)    DEFAULT 0 NOT NULL,
  createdby   VARCHAR2(80),
  editby      VARCHAR2(80),
  CONSTRAINT pk_model PRIMARY KEY (modelid),
  CONSTRAINT fk_model_vendor FOREIGN KEY (vendorid) REFERENCES vendor (vendorid),
  CONSTRAINT fk_model_region FOREIGN KEY (regionid) REFERENCES region (regionid)
);


--================================================================================
-- 3. INDEXING
--================================================================================

-- Uniqueness (case-insensitive) on names/codes used in add_edit duplicate checks
CREATE UNIQUE INDEX uk_region_name        ON region (UPPER(regionname));
CREATE UNIQUE INDEX uk_vendor_company     ON vendor (UPPER(company));
CREATE UNIQUE INDEX uk_branch_region_name ON branch (regionid, UPPER(branchname));
CREATE UNIQUE INDEX uk_model_code         ON model (UPPER(modelcode));

-- FK / join performance indexes
CREATE INDEX idx_branch_regionid ON branch (regionid);
CREATE INDEX idx_model_vendorid  ON model (vendorid);
CREATE INDEX idx_model_regionid  ON model (regionid);

-- Status filter indexes (used by every "get" list query, default status = 0)
CREATE INDEX idx_region_status ON region (status);
CREATE INDEX idx_vendor_status ON vendor (status);
CREATE INDEX idx_branch_status ON branch (status);
CREATE INDEX idx_model_status  ON model (status);


--================================================================================
-- 4. REGION PROCEDURES
--================================================================================

-- ---------- ADD / EDIT ----------
CREATE OR REPLACE PROCEDURE add_edit_region
(
  vregionid    IN NUMBER,
  vregionname  IN VARCHAR2,
  vstatus      IN NUMBER,
  vcreatedby   IN VARCHAR2,
  vmessage    OUT VARCHAR2
)
AS
  IsExist         NUMBER;
  DupExist        NUMBER;
  cur_regionname  region.regionname%TYPE;
  cur_status      region.status%TYPE;
  eff_regionname  region.regionname%TYPE;
  eff_status      region.status%TYPE;
BEGIN
  IF vregionid IS NULL THEN
    IsExist := 0;
  ELSE
    SELECT COUNT(*) INTO IsExist FROM region WHERE regionid = vregionid;
  END IF;

  -- Load current values so NULL input on update keeps old data
  IF IsExist = 1 THEN
    SELECT regionname, status
      INTO cur_regionname, cur_status
      FROM region
     WHERE regionid = vregionid;
  END IF;

  eff_regionname := NVL(vregionname, cur_regionname);
  eff_status     := NVL(vstatus, cur_status);

  -- Duplicate region name check (excluding self on edit), based on effective name
  SELECT COUNT(*) INTO DupExist
    FROM region
   WHERE UPPER(regionname) = UPPER(eff_regionname)
     AND (vregionid IS NULL OR regionid <> vregionid);

  IF DupExist > 0 THEN
    vmessage := 'Region Name Already Exists';
    RETURN;
  END IF;

  IF IsExist = 0 THEN
    INSERT INTO region (regionid, regionname, status, createdby)
    VALUES (seq_region.NEXTVAL, vregionname, NVL(vstatus, 0),
            vcreatedby || ' | ' || TO_CHAR(currentdatetime(), 'DD-MON-YYYY HH24:MI:SS'));
    vmessage := 'Successfully Inserted';
  ELSE
    UPDATE region
       SET regionname = eff_regionname,
           status     = eff_status,
           editby     = vcreatedby || ' | ' || TO_CHAR(currentdatetime(), 'DD-MON-YYYY HH24:MI:SS')
     WHERE regionid = vregionid;
    vmessage := 'Successfully Updated';
  END IF;
  COMMIT;
EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    ROLLBACK;
    vmessage := 'Duplicate Entry';
  WHEN OTHERS THEN
    ROLLBACK;
    vmessage := 'Error in Modification';
    RAISE;
END;
/

-- ---------- GET (default: only active, status = 0) ----------
CREATE OR REPLACE PROCEDURE get_region
(
  vcursor   OUT SYS_REFCURSOR
)
AS
BEGIN
  OPEN vcursor FOR
    SELECT regionid, regionname, status, createdby, editby
      FROM region
     WHERE status = 0
     ORDER BY regionname;
END;
/

-- ---------- SOFT DELETE ----------
CREATE OR REPLACE PROCEDURE delete_region
(
  vregionid   IN NUMBER,
  vcreatedby  IN VARCHAR2,
  vmessage   OUT VARCHAR2
)
AS
BEGIN
  UPDATE region
     SET status = 1,
         editby = vcreatedby || ' | ' || TO_CHAR(currentdatetime(), 'DD-MON-YYYY HH24:MI:SS')
   WHERE regionid = vregionid;

  IF SQL%ROWCOUNT = 0 THEN
    vmessage := 'Record Not Found';
  ELSE
    vmessage := 'Successfully Deleted';
  END IF;
  COMMIT;
EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    ROLLBACK;
    vmessage := 'Duplicate Entry';
  WHEN OTHERS THEN
    ROLLBACK;
    vmessage := 'Error in Modification';
    RAISE;
END;
/


--================================================================================
-- 5. VENDOR PROCEDURES
--================================================================================

-- ---------- ADD / EDIT ----------
CREATE OR REPLACE PROCEDURE add_edit_vendor
(
  vvendorid   IN NUMBER,
  vcompany    IN VARCHAR2,
  vcontact    IN VARCHAR2,
  vphone      IN VARCHAR2,
  vemail      IN VARCHAR2,
  vaddress    IN VARCHAR2,
  vstatus     IN NUMBER,
  vcreatedby  IN VARCHAR2,
  vmessage   OUT VARCHAR2
)
AS
  IsExist      NUMBER;
  DupExist     NUMBER;
  cur_company  vendor.company%TYPE;
  cur_contact  vendor.contact%TYPE;
  cur_phone    vendor.phone%TYPE;
  cur_email    vendor.email%TYPE;
  cur_address  vendor.address%TYPE;
  cur_status   vendor.status%TYPE;
  eff_company  vendor.company%TYPE;
  eff_contact  vendor.contact%TYPE;
  eff_phone    vendor.phone%TYPE;
  eff_email    vendor.email%TYPE;
  eff_address  vendor.address%TYPE;
  eff_status   vendor.status%TYPE;
BEGIN
  IF vvendorid IS NULL THEN
    IsExist := 0;
  ELSE
    SELECT COUNT(*) INTO IsExist FROM vendor WHERE vendorid = vvendorid;
  END IF;

  IF IsExist = 1 THEN
    SELECT company, contact, phone, email, address, status
      INTO cur_company, cur_contact, cur_phone, cur_email, cur_address, cur_status
      FROM vendor
     WHERE vendorid = vvendorid;
  END IF;

  eff_company := NVL(vcompany, cur_company);
  eff_contact := NVL(vcontact, cur_contact);
  eff_phone   := NVL(vphone, cur_phone);
  eff_email   := NVL(vemail, cur_email);
  eff_address := NVL(vaddress, cur_address);
  eff_status  := NVL(vstatus, cur_status);

  SELECT COUNT(*) INTO DupExist
    FROM vendor
   WHERE UPPER(company) = UPPER(eff_company)
     AND (vvendorid IS NULL OR vendorid <> vvendorid);

  IF DupExist > 0 THEN
    vmessage := 'Vendor Company Already Exists';
    RETURN;
  END IF;

  IF IsExist = 0 THEN
    INSERT INTO vendor (vendorid, company, contact, phone, email, address, status, createdby)
    VALUES (seq_vendor.NEXTVAL, vcompany, vcontact, vphone, vemail, vaddress, NVL(vstatus, 0),
            vcreatedby || ' | ' || TO_CHAR(currentdatetime(), 'DD-MON-YYYY HH24:MI:SS'));
    vmessage := 'Successfully Inserted';
  ELSE
    UPDATE vendor
       SET company = eff_company,
           contact = eff_contact,
           phone   = eff_phone,
           email   = eff_email,
           address = eff_address,
           status  = eff_status,
           editby  = vcreatedby || ' | ' || TO_CHAR(currentdatetime(), 'DD-MON-YYYY HH24:MI:SS')
     WHERE vendorid = vvendorid;
    vmessage := 'Successfully Updated';
  END IF;
  COMMIT;
EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    ROLLBACK;
    vmessage := 'Duplicate Entry';
  WHEN OTHERS THEN
    ROLLBACK;
    vmessage := 'Error in Modification';
    RAISE;
END;
/

-- ---------- GET (default: only active, status = 0) ----------
CREATE OR REPLACE PROCEDURE get_vendor
(
  vcursor   OUT SYS_REFCURSOR
)
AS
BEGIN
  OPEN vcursor FOR
    SELECT vendorid, company, contact, phone, email, address, status, createdby, editby
      FROM vendor
     WHERE status = 0
     ORDER BY company;
END;
/

-- ---------- SOFT DELETE ----------
CREATE OR REPLACE PROCEDURE delete_vendor
(
  vvendorid   IN NUMBER,
  vcreatedby  IN VARCHAR2,
  vmessage   OUT VARCHAR2
)
AS
BEGIN
  UPDATE vendor
     SET status = 1,
         editby = vcreatedby || ' | ' || TO_CHAR(currentdatetime(), 'DD-MON-YYYY HH24:MI:SS')
   WHERE vendorid = vvendorid;

  IF SQL%ROWCOUNT = 0 THEN
    vmessage := 'Record Not Found';
  ELSE
    vmessage := 'Successfully Deleted';
  END IF;
  COMMIT;
EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    ROLLBACK;
    vmessage := 'Duplicate Entry';
  WHEN OTHERS THEN
    ROLLBACK;
    vmessage := 'Error in Modification';
    RAISE;
END;
/


--================================================================================
-- 6. BRANCH PROCEDURES
--================================================================================

-- ---------- ADD / EDIT ----------
CREATE OR REPLACE PROCEDURE add_edit_branch
(
  vbranchid    IN NUMBER,
  vbranchname  IN VARCHAR2,
  vregionid    IN NUMBER,
  vaddress     IN VARCHAR2,
  vstatus      IN NUMBER,
  vcreatedby   IN VARCHAR2,
  vmessage    OUT VARCHAR2
)
AS
  IsExist        NUMBER;
  DupExist       NUMBER;
  cur_branchname branch.branchname%TYPE;
  cur_regionid   branch.regionid%TYPE;
  cur_address    branch.address%TYPE;
  cur_status     branch.status%TYPE;
  eff_branchname branch.branchname%TYPE;
  eff_regionid   branch.regionid%TYPE;
  eff_address    branch.address%TYPE;
  eff_status     branch.status%TYPE;
BEGIN
  IF vbranchid IS NULL THEN
    IsExist := 0;
  ELSE
    SELECT COUNT(*) INTO IsExist FROM branch WHERE branchid = vbranchid;
  END IF;

  IF IsExist = 1 THEN
    SELECT branchname, regionid, address, status
      INTO cur_branchname, cur_regionid, cur_address, cur_status
      FROM branch
     WHERE branchid = vbranchid;
  END IF;

  eff_branchname := NVL(vbranchname, cur_branchname);
  eff_regionid   := NVL(vregionid, cur_regionid);
  eff_address    := NVL(vaddress, cur_address);
  eff_status     := NVL(vstatus, cur_status);

  -- Duplicate branch name check within same (effective) region, excluding self on edit
  SELECT COUNT(*) INTO DupExist
    FROM branch
   WHERE regionid = eff_regionid
     AND UPPER(branchname) = UPPER(eff_branchname)
     AND (vbranchid IS NULL OR branchid <> vbranchid);

  IF DupExist > 0 THEN
    vmessage := 'Branch Name Already Exists In This Region';
    RETURN;
  END IF;

  IF IsExist = 0 THEN
    INSERT INTO branch (branchid, branchname, regionid, address, status, createdby)
    VALUES (seq_branch.NEXTVAL, vbranchname, vregionid, vaddress, NVL(vstatus, 0),
            vcreatedby || ' | ' || TO_CHAR(currentdatetime(), 'DD-MON-YYYY HH24:MI:SS'));
    vmessage := 'Successfully Inserted';
  ELSE
    UPDATE branch
       SET branchname = eff_branchname,
           regionid   = eff_regionid,
           address    = eff_address,
           status     = eff_status,
           editby     = vcreatedby || ' | ' || TO_CHAR(currentdatetime(), 'DD-MON-YYYY HH24:MI:SS')
     WHERE branchid = vbranchid;
    vmessage := 'Successfully Updated';
  END IF;
  COMMIT;
EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    ROLLBACK;
    vmessage := 'Duplicate Entry';
  WHEN OTHERS THEN
    ROLLBACK;
    vmessage := 'Error in Modification';
    RAISE;
END;
/

-- ---------- GET (joined with region name, default: only active, status = 0) ----------
CREATE OR REPLACE PROCEDURE get_branch
(
  vcursor   OUT SYS_REFCURSOR
)
AS
BEGIN
  OPEN vcursor FOR
    SELECT b.branchid, b.branchname, b.regionid, r.regionname,
           b.address, b.status, b.createdby, b.editby
      FROM branch b
      JOIN region r ON r.regionid = b.regionid
     WHERE b.status = 0
     ORDER BY b.branchname;
END;
/

-- ---------- SOFT DELETE ----------
CREATE OR REPLACE PROCEDURE delete_branch
(
  vbranchid   IN NUMBER,
  vcreatedby  IN VARCHAR2,
  vmessage   OUT VARCHAR2
)
AS
BEGIN
  UPDATE branch
     SET status = 1,
         editby = vcreatedby || ' | ' || TO_CHAR(currentdatetime(), 'DD-MON-YYYY HH24:MI:SS')
   WHERE branchid = vbranchid;

  IF SQL%ROWCOUNT = 0 THEN
    vmessage := 'Record Not Found';
  ELSE
    vmessage := 'Successfully Deleted';
  END IF;
  COMMIT;
EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    ROLLBACK;
    vmessage := 'Duplicate Entry';
  WHEN OTHERS THEN
    ROLLBACK;
    vmessage := 'Error in Modification';
    RAISE;
END;
/


--================================================================================
-- 7. MODEL PROCEDURES
--================================================================================

-- ---------- ADD / EDIT ----------
CREATE OR REPLACE PROCEDURE add_edit_model
(
  vmodelid    IN NUMBER,
  vvendorid   IN NUMBER,
  vregionid   IN NUMBER,
  vmodelname  IN VARCHAR2,
  vmodelcode  IN VARCHAR2,
  vmrp        IN NUMBER,
  vcash       IN NUMBER,
  vhscode     IN VARCHAR2,
  vstatus     IN NUMBER,
  vcreatedby  IN VARCHAR2,
  vmessage   OUT VARCHAR2
)
AS
  IsExist       NUMBER;
  DupExist      NUMBER;
  cur_vendorid  model.vendorid%TYPE;
  cur_regionid  model.regionid%TYPE;
  cur_modelname model.modelname%TYPE;
  cur_modelcode model.modelcode%TYPE;
  cur_mrp       model.mrp%TYPE;
  cur_cash      model.cash%TYPE;
  cur_hscode    model.hscode%TYPE;
  cur_status    model.status%TYPE;
  eff_vendorid  model.vendorid%TYPE;
  eff_regionid  model.regionid%TYPE;
  eff_modelname model.modelname%TYPE;
  eff_modelcode model.modelcode%TYPE;
  eff_mrp       model.mrp%TYPE;
  eff_cash      model.cash%TYPE;
  eff_hscode    model.hscode%TYPE;
  eff_status    model.status%TYPE;
BEGIN
  IF vmodelid IS NULL THEN
    IsExist := 0;
  ELSE
    SELECT COUNT(*) INTO IsExist FROM model WHERE modelid = vmodelid;
  END IF;

  IF IsExist = 1 THEN
    SELECT vendorid, regionid, modelname, modelcode, mrp, cash, hscode, status
      INTO cur_vendorid, cur_regionid, cur_modelname, cur_modelcode, cur_mrp, cur_cash, cur_hscode, cur_status
      FROM model
     WHERE modelid = vmodelid;
  END IF;

  eff_vendorid  := NVL(vvendorid, cur_vendorid);
  eff_regionid  := NVL(vregionid, cur_regionid);
  eff_modelname := NVL(vmodelname, cur_modelname);
  eff_modelcode := NVL(vmodelcode, cur_modelcode);
  eff_mrp       := NVL(vmrp, cur_mrp);
  eff_cash      := NVL(vcash, cur_cash);
  eff_hscode    := NVL(vhscode, cur_hscode);
  eff_status    := NVL(vstatus, cur_status);

  -- Duplicate model code check (excluding self on edit), based on effective code
  SELECT COUNT(*) INTO DupExist
    FROM model
   WHERE UPPER(modelcode) = UPPER(eff_modelcode)
     AND (vmodelid IS NULL OR modelid <> vmodelid);

  IF DupExist > 0 THEN
    vmessage := 'Model Code Already Exists';
    RETURN;
  END IF;

  IF IsExist = 0 THEN
    INSERT INTO model
      (modelid, vendorid, regionid, modelname, modelcode, mrp, cash, hscode, status, createdby)
    VALUES
      (seq_model.NEXTVAL, vvendorid, vregionid, vmodelname, vmodelcode, vmrp, vcash, vhscode, NVL(vstatus, 0),
       vcreatedby || ' | ' || TO_CHAR(currentdatetime(), 'DD-MON-YYYY HH24:MI:SS'));
    vmessage := 'Successfully Inserted';
  ELSE
    UPDATE model
       SET vendorid  = eff_vendorid,
           regionid  = eff_regionid,
           modelname = eff_modelname,
           modelcode = eff_modelcode,
           mrp       = eff_mrp,
           cash      = eff_cash,
           hscode    = eff_hscode,
           status    = eff_status,
           editby    = vcreatedby || ' | ' || TO_CHAR(currentdatetime(), 'DD-MON-YYYY HH24:MI:SS')
     WHERE modelid = vmodelid;
    vmessage := 'Successfully Updated';
  END IF;
  COMMIT;
EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    ROLLBACK;
    vmessage := 'Duplicate Entry';
  WHEN OTHERS THEN
    ROLLBACK;
    vmessage := 'Error in Modification';
    RAISE;
END;
/

-- ---------- GET (joined with vendor & region names, default: only active, status = 0) ----------
CREATE OR REPLACE PROCEDURE get_model
(
  vcursor   OUT SYS_REFCURSOR
)
AS
BEGIN
  OPEN vcursor FOR
    SELECT m.modelid, m.vendorid, v.company, m.regionid, r.regionname,
           m.modelname, m.modelcode, m.mrp, m.cash, m.hscode,
           m.status, m.createdby, m.editby
      FROM model m
      JOIN vendor v ON v.vendorid = m.vendorid
      JOIN region r ON r.regionid = m.regionid
     WHERE m.status = 0
     ORDER BY m.modelname;
END;
/

-- ---------- SOFT DELETE ----------
CREATE OR REPLACE PROCEDURE delete_model
(
  vmodelid    IN NUMBER,
  vcreatedby  IN VARCHAR2,
  vmessage   OUT VARCHAR2
)
AS
BEGIN
  UPDATE model
     SET status = 1,
         editby = vcreatedby || ' | ' || TO_CHAR(currentdatetime(), 'DD-MON-YYYY HH24:MI:SS')
   WHERE modelid = vmodelid;

  IF SQL%ROWCOUNT = 0 THEN
    vmessage := 'Record Not Found';
  ELSE
    vmessage := 'Successfully Deleted';
  END IF;
  COMMIT;
EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    ROLLBACK;
    vmessage := 'Duplicate Entry';
  WHEN OTHERS THEN
    ROLLBACK;
    vmessage := 'Error in Modification';
    RAISE;
END;
/
